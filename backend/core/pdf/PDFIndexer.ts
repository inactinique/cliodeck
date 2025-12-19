import { randomUUID } from 'crypto';
import { PDFExtractor } from './PDFExtractor';
import { DocumentChunker, CHUNKING_CONFIGS } from '../chunking/DocumentChunker';
import { VectorStore } from '../vector-store/VectorStore';
import { OllamaClient } from '../llm/OllamaClient';
import type { PDFDocument } from '../../types/pdf-document';

export interface IndexingProgress {
  stage: 'extracting' | 'chunking' | 'embedding' | 'completed' | 'error';
  progress: number; // 0-100
  message: string;
  currentPage?: number;
  totalPages?: number;
  currentChunk?: number;
  totalChunks?: number;
}

export class PDFIndexer {
  private pdfExtractor: PDFExtractor;
  private chunker: DocumentChunker;
  private vectorStore: VectorStore;
  private ollamaClient: OllamaClient;

  constructor(
    vectorStore: VectorStore,
    ollamaClient: OllamaClient,
    chunkingConfig: 'cpuOptimized' | 'standard' | 'large' = 'cpuOptimized'
  ) {
    this.pdfExtractor = new PDFExtractor();
    this.chunker = new DocumentChunker(CHUNKING_CONFIGS[chunkingConfig]);
    this.vectorStore = vectorStore;
    this.ollamaClient = ollamaClient;
  }

  /**
   * Indexe un PDF complet
   */
  async indexPDF(
    filePath: string,
    bibtexKey?: string,
    onProgress?: (progress: IndexingProgress) => void
  ): Promise<PDFDocument> {
    try {
      // 1. Extraire le texte + métadonnées
      onProgress?.({
        stage: 'extracting',
        progress: 10,
        message: 'Extraction du texte PDF...',
      });

      const { pages, metadata, title } = await this.pdfExtractor.extractDocument(filePath);

      onProgress?.({
        stage: 'extracting',
        progress: 25,
        message: `${pages.length} pages extraites`,
        totalPages: pages.length,
      });

      // 2. Extraire auteur et année des métadonnées
      const author = await this.pdfExtractor.extractAuthor(filePath);
      const year = await this.pdfExtractor.extractYear(filePath);

      // 3. Créer le document
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

      // 4. Sauvegarder le document
      this.vectorStore.saveDocument(document);

      // 5. Créer les chunks
      onProgress?.({
        stage: 'chunking',
        progress: 35,
        message: 'Découpage du texte en chunks...',
      });

      const chunks = this.chunker.createChunks(pages, documentId);

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

      // 6. Générer les embeddings et sauvegarder
      onProgress?.({
        stage: 'embedding',
        progress: 50,
        message: 'Génération des embeddings...',
        totalChunks: chunks.length,
      });

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

      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: `✅ Indexation terminée: ${chunks.length} chunks`,
      });

      console.log(`✅ PDF indexé: ${document.title}`);
      console.log(`   - ${chunks.length} chunks`);
      console.log(`   - ${stats.totalWords} mots total`);
      console.log(`   - Moyenne: ${stats.averageWordCount} mots/chunk`);

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
