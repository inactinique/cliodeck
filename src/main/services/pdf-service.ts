// @ts-nocheck
import { PDFIndexer } from '../../../backend/core/pdf/PDFIndexer.js';
import { VectorStore } from '../../../backend/core/vector-store/VectorStore.js';
import { OllamaClient } from '../../../backend/core/llm/OllamaClient.js';
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
}

export const pdfService = new PDFService();
