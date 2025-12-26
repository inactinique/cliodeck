// @ts-nocheck
import { PDFIndexer } from '../../../backend/core/pdf/PDFIndexer.js';
import { VectorStore } from '../../../backend/core/vector-store/VectorStore.js';
import { OllamaClient } from '../../../backend/core/llm/OllamaClient.js';
import { KnowledgeGraphBuilder } from '../../../backend/core/analysis/KnowledgeGraphBuilder.js';
import { TopicModelingService } from '../../../backend/core/analysis/TopicModelingService.js';
import { configManager } from './config-manager.js';
import path from 'path';
import { app } from 'electron';

class PDFService {
  private pdfIndexer: PDFIndexer | null = null;
  private vectorStore: VectorStore | null = null;
  private ollamaClient: OllamaClient | null = null;
  private currentProjectPath: string | null = null;

  /**
   * Initialise le PDF Service pour un projet spécifique
   * @param projectPath Chemin absolu vers le dossier du projet
   * @throws Error si projectPath n'est pas fourni ou si c'est un projet "notes"
   */
  async init(projectPath: string) {
    if (!projectPath) {
      throw new Error('PDF Service requires a project path');
    }

    // Si déjà initialisé pour ce projet, ne rien faire
    if (this.currentProjectPath === projectPath && this.vectorStore) {
      console.log('✅ PDF Service already initialized for this project');
      return;
    }

    // Fermer la base précédente si elle existe
    if (this.vectorStore) {
      this.vectorStore.close();
    }

    try {
      const config = configManager.getLLMConfig();
      const ragConfig = configManager.getRAGConfig();

      // Initialiser Ollama client
      this.ollamaClient = new OllamaClient(
        config.ollamaURL,
        config.ollamaChatModel,
        config.ollamaEmbeddingModel
      );

      // Initialiser VectorStore pour ce projet spécifique
      this.vectorStore = new VectorStore(projectPath);

      // Initialiser PDFIndexer avec configuration du summarizer
      this.pdfIndexer = new PDFIndexer(
        this.vectorStore,
        this.ollamaClient,
        ragConfig.chunkingConfig,
        ragConfig.summarizer
      );

      this.currentProjectPath = projectPath;

      console.log('✅ PDF Service initialized for project');
      console.log(`   Project: ${projectPath}`);
      console.log(`   VectorStore DB: ${this.vectorStore.projectPath}/.mdfocus/vectors.db`);
      console.log(`   Ollama URL: ${config.ollamaURL}`);
    } catch (error) {
      console.error('❌ Failed to initialize PDF Service:', error);
      throw error;
    }
  }

  /**
   * Vérifie si le service est initialisé
   */
  private ensureInitialized() {
    if (!this.vectorStore || !this.pdfIndexer || !this.ollamaClient) {
      throw new Error('PDF Service not initialized. Call init(projectPath) first.');
    }
  }

  async indexPDF(filePath: string, bibtexKey?: string, onProgress?: any) {
    this.ensureInitialized();
    return this.pdfIndexer!.indexPDF(filePath, bibtexKey, onProgress);
  }

  async search(query: string, options?: any) {
    this.ensureInitialized();

    // Generate embedding for the query using Ollama
    const queryEmbedding = await this.ollamaClient!.generateEmbedding(query);

    const ragConfig = configManager.getRAGConfig();
    const results = this.vectorStore!.search(
      queryEmbedding,
      options?.topK || ragConfig.topK,
      options?.documentIds
    );

    // Filter by similarity threshold
    const threshold = options?.threshold || ragConfig.similarityThreshold;
    return results.filter(r => r.similarity >= threshold);
  }

  async getAllDocuments() {
    this.ensureInitialized();
    return this.vectorStore!.getAllDocuments();
  }

  async deleteDocument(documentId: string) {
    this.ensureInitialized();
    return this.vectorStore!.deleteDocument(documentId);
  }

  async getStatistics() {
    this.ensureInitialized();
    return this.vectorStore!.getStatistics();
  }

  /**
   * Retourne le chemin du projet actuel
   */
  getCurrentProjectPath(): string | null {
    return this.currentProjectPath;
  }

  getOllamaClient() {
    return this.ollamaClient;
  }

  getVectorStore() {
    return this.vectorStore;
  }

  /**
   * Construit et retourne le graphe de connaissances
   */
  async buildKnowledgeGraph(options?: any) {
    this.ensureInitialized();

    const graphBuilder = new KnowledgeGraphBuilder(this.vectorStore!);
    const graph = await graphBuilder.buildGraph({
      includeSimilarityEdges: options?.includeSimilarityEdges !== false,
      similarityThreshold: options?.similarityThreshold || 0.7,
      includeAuthorNodes: options?.includeAuthorNodes || false,
      computeLayout: options?.computeLayout !== false,
    });

    return graphBuilder.exportForVisualization(graph);
  }

  /**
   * Retourne les statistiques du corpus
   */
  async getCorpusStatistics() {
    this.ensureInitialized();

    const stats = await this.vectorStore!.getStatistics();
    const documents = await this.vectorStore!.getAllDocuments();

    // Calculer statistiques supplémentaires
    const languages = new Set<string>();
    const years = new Set<string>();
    const authors = new Set<string>();

    for (const doc of documents) {
      if (doc.language) languages.add(doc.language);
      if (doc.year) years.add(doc.year);
      if (doc.author) authors.add(doc.author);
    }

    // Compter les citations
    const totalCitationsExtracted = this.vectorStore!.getTotalCitationsCount();
    const matchedCitations = this.vectorStore!.getMatchedCitationsCount();

    return {
      documentCount: stats.documentCount,
      chunkCount: stats.chunkCount,
      citationCount: matchedCitations, // Citations internes (matchées dans le corpus)
      totalCitationsExtracted: totalCitationsExtracted, // Total des citations extraites
      languageCount: languages.size,
      languages: Array.from(languages),
      yearRange: years.size > 0 ? {
        min: Math.min(...Array.from(years).map(y => parseInt(y))),
        max: Math.max(...Array.from(years).map(y => parseInt(y))),
      } : null,
      authorCount: authors.size,
    };
  }

  /**
   * Analyse les topics du corpus avec BERTopic
   */
  async analyzeTopics(options?: any) {
    this.ensureInitialized();

    const documents = await this.vectorStore!.getAllDocuments();

    if (documents.length < 5) {
      throw new Error('Topic modeling requires at least 5 documents');
    }

    // Récupérer les embeddings et textes
    const embeddings: Float32Array[] = [];
    const texts: string[] = [];
    const documentIds: string[] = [];

    for (const doc of documents) {
      // Utiliser le résumé si disponible, sinon le titre
      const text = doc.summary || doc.title;
      let embedding: Float32Array | null = null;

      // Essayer d'utiliser l'embedding du résumé
      if (doc.summaryEmbedding) {
        embedding = doc.summaryEmbedding;
      } else {
        // Sinon, utiliser l'embedding du premier chunk
        const chunks = this.vectorStore!.getChunksForDocument(doc.id);
        if (chunks.length > 0 && chunks[0].embedding) {
          embedding = chunks[0].embedding;
        }
      }

      if (text && embedding) {
        // Valider que l'embedding est complet (pas de valeurs null/undefined)
        const isValid = embedding.length > 0 && !Array.from(embedding).some(v => v === null || v === undefined || isNaN(v));

        if (isValid) {
          embeddings.push(embedding);
          texts.push(text);
          documentIds.push(doc.id);
        } else {
          console.warn(`⚠️ Skipping document ${doc.id}: invalid embedding (contains null/NaN values)`);
        }
      }
    }

    if (embeddings.length < 5) {
      throw new Error(`Not enough documents with embeddings for topic modeling. Found ${embeddings.length} documents, need at least 5.`);
    }

    // Initialiser et démarrer le service Topic Modeling
    const topicService = new TopicModelingService();

    try {
      await topicService.start();

      const result = await topicService.analyzeTopics(
        embeddings,
        texts,
        documentIds,
        {
          minTopicSize: options?.minTopicSize || 3,
          language: options?.language || 'multilingual',
          nGramRange: options?.nGramRange || [1, 3],
        }
      );

      return result;
    } finally {
      // Toujours arrêter le service
      await topicService.stop();
    }
  }
}

export const pdfService = new PDFService();
