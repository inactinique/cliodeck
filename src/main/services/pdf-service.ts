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
  private initialized: boolean = false;

  async init() {
    if (this.initialized) return;

    try {
      const config = configManager.getLLMConfig();
      const ragConfig = configManager.getRAGConfig();

      // Initialiser Ollama client
      this.ollamaClient = new OllamaClient(
        config.ollamaURL,
        config.ollamaChatModel,
        config.ollamaEmbeddingModel
      );

      // Initialiser VectorStore avec un chemin dans userData
      const dbPath = path.join(app.getPath('userData'), 'vector-store.db');
      this.vectorStore = new VectorStore(dbPath);

      // Initialiser PDFIndexer
      this.pdfIndexer = new PDFIndexer(
        this.vectorStore,
        this.ollamaClient,
        ragConfig.chunkingConfig
      );

      this.initialized = true;
      console.log('✅ PDF Service initialized');
      console.log(`   VectorStore DB: ${dbPath}`);
      console.log(`   Ollama URL: ${config.ollamaURL}`);
    } catch (error) {
      console.error('❌ Failed to initialize PDF Service:', error);
      throw error;
    }
  }

  async indexPDF(filePath: string, bibtexKey?: string, onProgress?: any) {
    if (!this.initialized) await this.init();
    return this.pdfIndexer!.indexPDF(filePath, bibtexKey, onProgress);
  }

  async search(query: string, options?: any) {
    if (!this.initialized) await this.init();

    const ragConfig = configManager.getRAGConfig();
    const results = await this.vectorStore!.search(query, {
      topK: options?.topK || ragConfig.topK,
      threshold: options?.threshold || ragConfig.similarityThreshold,
    });

    return results;
  }

  async getAllDocuments() {
    if (!this.initialized) await this.init();
    return this.vectorStore!.getAllDocuments();
  }

  async deleteDocument(documentId: string) {
    if (!this.initialized) await this.init();
    return this.vectorStore!.deleteDocument(documentId);
  }

  async getStatistics() {
    if (!this.initialized) await this.init();
    return this.vectorStore!.getStatistics();
  }

  getOllamaClient() {
    return this.ollamaClient;
  }
}

export const pdfService = new PDFService();
