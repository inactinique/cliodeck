import { randomUUID } from 'crypto';
import { PDFExtractor } from './PDFExtractor';
import { DocumentChunker, CHUNKING_CONFIGS } from '../chunking/DocumentChunker';
import { AdaptiveChunker } from '../chunking/AdaptiveChunker';
import { VectorStore } from '../vector-store/VectorStore';
import { EnhancedVectorStore } from '../vector-store/EnhancedVectorStore';
import { OllamaClient } from '../llm/OllamaClient';
import { CitationExtractor } from '../analysis/CitationExtractor';
import { DocumentSummarizer, type SummarizerConfig } from '../analysis/DocumentSummarizer';
import type { PDFDocument, Citation } from '../../types/pdf-document';

export interface IndexingProgress {
  stage:
    | 'extracting'
    | 'analyzing'
    | 'citations'
    | 'summarizing'
    | 'chunking'
    | 'embedding'
    | 'similarities'
    | 'completed'
    | 'error';
  progress: number; // 0-100
  message: string;
  currentPage?: number;
  totalPages?: number;
  currentChunk?: number;
  totalChunks?: number;
}

export class PDFIndexer {
  private pdfExtractor: PDFExtractor;
  private chunker: DocumentChunker | AdaptiveChunker;
  private vectorStore: VectorStore | EnhancedVectorStore;
  private ollamaClient: OllamaClient;
  private citationExtractor: CitationExtractor;
  private documentSummarizer: DocumentSummarizer | null = null;
  private summarizerConfig: SummarizerConfig;
  private useAdaptiveChunking: boolean;

  constructor(
    vectorStore: VectorStore | EnhancedVectorStore,
    ollamaClient: OllamaClient,
    chunkingConfig: 'cpuOptimized' | 'standard' | 'large' = 'cpuOptimized',
    summarizerConfig?: SummarizerConfig,
    useAdaptiveChunking: boolean = false
  ) {
    this.pdfExtractor = new PDFExtractor();
    this.useAdaptiveChunking = useAdaptiveChunking;

    // Choose chunker based on configuration
    if (useAdaptiveChunking) {
      console.log('📐 Using AdaptiveChunker (structure-aware)');
      this.chunker = new AdaptiveChunker(CHUNKING_CONFIGS[chunkingConfig]);
    } else {
      console.log('📐 Using DocumentChunker (fixed-size)');
      this.chunker = new DocumentChunker(CHUNKING_CONFIGS[chunkingConfig]);
    }

    this.vectorStore = vectorStore;
    this.ollamaClient = ollamaClient;
    this.citationExtractor = new CitationExtractor();

    // Initialiser DocumentSummarizer si activé
    this.summarizerConfig = summarizerConfig || {
      enabled: false,
      method: 'extractive',
      maxLength: 250,
    };

    if (this.summarizerConfig.enabled) {
      this.documentSummarizer = new DocumentSummarizer(this.summarizerConfig, ollamaClient);
    }
  }

  /**
   * Indexe un PDF complet
   */
  async indexPDF(
    filePath: string,
    bibtexKey?: string,
    onProgress?: (progress: IndexingProgress) => void,
    customTitle?: string
  ): Promise<PDFDocument> {
    try {
      // 1. Extraire le texte + métadonnées
      onProgress?.({
        stage: 'extracting',
        progress: 10,
        message: 'Extraction du texte PDF...',
      });

      const { pages, metadata, title: extractedTitle } = await this.pdfExtractor.extractDocument(filePath);

      // Use custom title if provided, otherwise use extracted title
      const title = customTitle || extractedTitle;

      onProgress?.({
        stage: 'extracting',
        progress: 25,
        message: `${pages.length} pages extraites`,
        totalPages: pages.length,
      });

      // 2. Extraire auteur et année des métadonnées
      const author = await this.pdfExtractor.extractAuthor(filePath);
      const year = await this.pdfExtractor.extractYear(filePath);

      // 3. Extraire le texte complet pour analyse
      const fullText = pages.map((p) => p.text).join('\n\n');

      // 4. Détecter la langue du document
      onProgress?.({
        stage: 'analyzing',
        progress: 27,
        message: 'Analyse du document...',
      });

      const language = this.citationExtractor.detectLanguage(fullText);
      console.log(`   Langue détectée: ${language}`);

      // 5. Extraction des citations
      onProgress?.({
        stage: 'citations',
        progress: 30,
        message: 'Extraction des citations...',
      });

      const citations = this.citationExtractor.extractCitations(fullText, pages);
      console.log(`   Citations extraites: ${citations.length}`);

      // Statistiques sur les citations
      if (citations.length > 0) {
        const stats = this.citationExtractor.getCitationStatistics(citations);
        console.log(
          `   - ${stats.totalCitations} citations, ${stats.uniqueAuthors} auteurs, années ${stats.yearRange.min}-${stats.yearRange.max}`
        );
      }

      // 6. Génération du résumé (optionnel)
      let summary: string | undefined;
      let summaryEmbedding: Float32Array | undefined;

      if (this.documentSummarizer) {
        onProgress?.({
          stage: 'summarizing',
          progress: 33,
          message: `Génération du résumé (${this.summarizerConfig.method})...`,
        });

        summary = await this.documentSummarizer.generateSummary(fullText, metadata);

        // Générer l'embedding du résumé
        if (summary) {
          summaryEmbedding = await this.documentSummarizer.generateSummaryEmbedding(summary);
          console.log(`   Résumé généré: ${summary.split(' ').length} mots`);
        }
      }

      // 7. Créer le document avec données enrichies
      const documentId = randomUUID();
      const now = new Date();

      const document: PDFDocument = {
        id: documentId,
        fileURL: filePath,
        title,
        author,
        year,
        bibtexKey,
        pageCount: pages.length,
        metadata,
        createdAt: now,
        indexedAt: now,
        lastAccessedAt: now,
        get displayString() {
          if (this.author && this.year) {
            return `${this.author} (${this.year})`;
          }
          return this.title;
        },
      };

      // Ajouter les champs enrichis
      (document as any).language = language;
      (document as any).citationsExtracted = citations;
      (document as any).summary = summary;
      (document as any).summaryEmbedding = summaryEmbedding;

      // 8. Sauvegarder le document
      this.vectorStore.saveDocument(document);

      // 9. Matcher et sauvegarder les citations avec documents existants
      const allDocuments = this.vectorStore.getAllDocuments();
      const citationMatches = this.citationExtractor.matchCitationsWithDocuments(
        citations,
        allDocuments
      );

      // Sauvegarder les citations matchées en BDD
      for (const citation of citations) {
        const citationId = randomUUID();
        const targetDocId = citationMatches.get(citation.id);

        this.vectorStore.saveCitation({
          id: citationId,
          sourceDocId: documentId,
          targetCitation: citation.text,
          targetDocId,
          context: citation.context,
          pageNumber: citation.pageNumber,
        });
      }

      if (citationMatches.size > 0) {
        console.log(`   Citations matchées: ${citationMatches.size}/${citations.length}`);
      }

      // 10. Créer les chunks
      onProgress?.({
        stage: 'chunking',
        progress: 40,
        message: 'Découpage du texte en chunks...',
      });

      // Pass document metadata to adaptive chunker for context enhancement
      const documentMeta = {
        title: document.title,
        abstract: summary,
      };

      const chunks =
        this.chunker instanceof AdaptiveChunker
          ? this.chunker.createChunks(pages, documentId, documentMeta)
          : this.chunker.createChunks(pages, documentId);

      const stats = this.chunker.getChunkingStats(chunks);
      console.log(
        `📊 Chunking: ${stats.totalChunks} chunks, ${stats.averageWordCount} mots/chunk en moyenne`
      );

      onProgress?.({
        stage: 'chunking',
        progress: 45,
        message: `${chunks.length} chunks créés`,
        totalChunks: chunks.length,
      });

      // 11. Générer les embeddings et sauvegarder
      onProgress?.({
        stage: 'embedding',
        progress: 50,
        message: 'Génération des embeddings...',
        totalChunks: chunks.length,
      });

      // Check if we're using EnhancedVectorStore
      const isEnhancedStore = this.vectorStore instanceof EnhancedVectorStore;

      if (isEnhancedStore) {
        // Batch processing for EnhancedVectorStore
        console.log('📦 Using batch indexing for EnhancedVectorStore');
        const chunksWithEmbeddings = [];

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];

          // Générer l'embedding
          const embedding = await this.ollamaClient.generateEmbedding(chunk.content);

          chunksWithEmbeddings.push({ chunk, embedding });

          // Mise à jour de la progression
          const progress = 50 + Math.floor((i / chunks.length) * 40);
          onProgress?.({
            stage: 'embedding',
            progress,
            message: `Embeddings: ${i + 1}/${chunks.length}`,
            currentChunk: i + 1,
            totalChunks: chunks.length,
          });

          // Log progression tous les 10 chunks
          if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
            console.log(`  Embeddings: ${i + 1}/${chunks.length}`);
          }
        }

        // Batch add to all indexes (HNSW, BM25, SQLite)
        await (this.vectorStore as EnhancedVectorStore).addChunks(chunksWithEmbeddings);

        onProgress?.({
          stage: 'embedding',
          progress: 95,
          message: 'Index HNSW et BM25 construits',
        });
      } else {
        // Original behavior for VectorStore
        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];

          // Générer l'embedding
          const embedding = await this.ollamaClient.generateEmbedding(chunk.content);

          // Sauvegarder le chunk avec son embedding
          this.vectorStore.saveChunk(chunk, embedding);

          // Mise à jour de la progression
          const progress = 50 + Math.floor((i / chunks.length) * 45);
          onProgress?.({
            stage: 'embedding',
            progress,
            message: `Embeddings: ${i + 1}/${chunks.length}`,
            currentChunk: i + 1,
            totalChunks: chunks.length,
          });

          // Log progression tous les 10 chunks
          if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
            console.log(`  Embeddings: ${i + 1}/${chunks.length}`);
          }
        }
      }

      // 12. Calculer les similarités avec les autres documents
      onProgress?.({
        stage: 'similarities',
        progress: 95,
        message: 'Calcul des similarités avec les autres documents...',
      });

      // Get the base VectorStore for similarity calculations
      const baseStore = isEnhancedStore
        ? (this.vectorStore as EnhancedVectorStore).getBaseStore()
        : (this.vectorStore as VectorStore);

      const similaritiesCount = baseStore.computeAndSaveSimilarities(
        documentId,
        0.5 // Seuil de similarité
      );

      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: `✅ Indexation terminée: ${chunks.length} chunks, ${similaritiesCount} similarités`,
      });

      console.log(`✅ PDF indexé: ${document.title}`);
      console.log(`   - ${chunks.length} chunks`);
      console.log(`   - ${stats.totalWords} mots total`);
      console.log(`   - Moyenne: ${stats.averageWordCount} mots/chunk`);
      console.log(`   - ${similaritiesCount} similarités calculées`);

      return document;
    } catch (error) {
      console.error('❌ Erreur indexation PDF:', error);
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: `Erreur: ${error}`,
      });
      throw error;
    }
  }

  /**
   * Indexe plusieurs PDFs en batch
   */
  async indexMultiplePDFs(
    filePaths: string[],
    onProgress?: (fileIndex: number, progress: IndexingProgress) => void
  ): Promise<PDFDocument[]> {
    const documents: PDFDocument[] = [];

    for (let i = 0; i < filePaths.length; i++) {
      const filePath = filePaths[i];

      console.log(`\n📁 Indexation ${i + 1}/${filePaths.length}: ${filePath}`);

      try {
        const document = await this.indexPDF(filePath, undefined, (progress) => {
          onProgress?.(i, progress);
        });

        documents.push(document);
      } catch (error) {
        console.error(`❌ Erreur avec ${filePath}:`, error);
        // Continuer avec les autres fichiers
      }
    }

    console.log(`\n✅ Indexation batch terminée: ${documents.length}/${filePaths.length} PDFs`);

    return documents;
  }

  /**
   * Ré-indexe un document existant
   */
  async reindexPDF(documentId: string): Promise<void> {
    // Récupérer le document
    const document = this.vectorStore.getDocument(documentId);
    if (!document) {
      throw new Error(`Document introuvable: ${documentId}`);
    }

    console.log(`🔄 Ré-indexation: ${document.title}`);

    // Supprimer l'ancien (les chunks seront supprimés en CASCADE)
    this.vectorStore.deleteDocument(documentId);

    // Ré-indexer
    await this.indexPDF(document.fileURL, document.bibtexKey);
  }

  /**
   * Vérifie si Ollama est disponible
   */
  async checkOllamaAvailability(): Promise<boolean> {
    return await this.ollamaClient.isAvailable();
  }

  /**
   * Liste les modèles disponibles
   */
  async listAvailableModels() {
    return await this.ollamaClient.listAvailableModels();
  }

  /**
   * Obtient les statistiques de la base vectorielle
   */
  getStatistics() {
    return this.vectorStore.getStatistics();
  }

  /**
   * Nettoie les chunks orphelins
   */
  cleanOrphanedChunks() {
    return this.vectorStore.cleanOrphanedChunks();
  }

  /**
   * Vérifie l'intégrité de la base
   */
  verifyIntegrity() {
    return this.vectorStore.verifyIntegrity();
  }
}
