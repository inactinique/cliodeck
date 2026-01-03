// @ts-nocheck
import { pdfService } from './pdf-service.js';
import { BrowserWindow } from 'electron';
import { historyService } from './history-service.js';
import { ContextCompressor } from '../../../backend/core/rag/ContextCompressor.js';

// Options enrichies pour le RAG
interface EnrichedRAGOptions {
  context?: boolean;              // Activer le RAG
  useGraphContext?: boolean;      // Utiliser le graphe de connaissances
  includeSummaries?: boolean;     // Utiliser résumés au lieu de chunks
  topK?: number;                  // Nombre de résultats de recherche
  additionalGraphDocs?: number;   // Nombre de documents liés à inclure
  window?: BrowserWindow;         // Fenêtre pour streaming
}

// Fonction utilitaire pour hasher une chaîne (identifier les questions identiques)
function hashString(str: string): string {
  let hash = 0;
  const normalized = str.toLowerCase().trim();
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(16);
}

class ChatService {
  private currentStream: any = null;
  private compressor: ContextCompressor = new ContextCompressor();

  /**
   * Convertit les résultats de recherche en utilisant les résumés au lieu des chunks
   */
  private convertChunksToSummaries(searchResults: any[]): any[] {
    const summaryResults: any[] = [];
    const seenDocuments = new Set<string>();

    for (const result of searchResults) {
      const docId = result.document.id;

      // Éviter les doublons (un résumé par document)
      if (seenDocuments.has(docId)) {
        continue;
      }

      if (result.document.summary) {
        seenDocuments.add(docId);
        summaryResults.push({
          document: result.document,
          chunk: {
            content: result.document.summary,
            pageNumber: 1
          },
          similarity: result.similarity
        });
      }
    }

    return summaryResults;
  }

  /**
   * Récupère les documents liés via le graphe de connaissances
   */
  private async getRelatedDocumentsFromGraph(
    documentIds: string[],
    limit: number = 3
  ): Promise<Set<string>> {
    const relatedDocs = new Set<string>();
    const vectorStore = pdfService.getVectorStore();

    if (!vectorStore) {
      return relatedDocs;
    }

    for (const docId of documentIds) {
      // Récupérer documents cités par ce document
      const citedDocs = vectorStore.getDocumentsCitedBy(docId);
      citedDocs.slice(0, Math.ceil(limit / 2)).forEach(id => relatedDocs.add(id));

      // Récupérer documents qui citent ce document
      const citingDocs = vectorStore.getDocumentsCiting(docId);
      citingDocs.slice(0, Math.ceil(limit / 2)).forEach(id => relatedDocs.add(id));

      // Récupérer documents similaires
      const similarDocs = vectorStore.getSimilarDocuments(docId, 0.7, limit);
      similarDocs.forEach(({ documentId }) => relatedDocs.add(documentId));
    }

    // Retirer les documents originaux
    documentIds.forEach(id => relatedDocs.delete(id));

    return relatedDocs;
  }

  async sendMessage(
    message: string,
    options: EnrichedRAGOptions = {}
  ): Promise<string> {
    const startTime = Date.now();
    const queryHash = hashString(message);

    try {
      // Obtenir le client Ollama
      const ollamaClient = pdfService.getOllamaClient();
      if (!ollamaClient) {
        throw new Error('Ollama client not initialized');
      }

      let fullResponse = '';
      let searchResults: any[] = [];
      let relatedDocuments: any[] = [];

      // Si contexte activé, rechercher dans les documents
      if (options.context) {
        const searchStart = Date.now();

        console.log('🔍 [RAG DETAILED DEBUG] Starting RAG search:', {
          query: message.substring(0, 100) + (message.length > 100 ? '...' : ''),
          queryLength: message.length,
          queryHash: queryHash,
          topK: options.topK,
          useGraphContext: options.useGraphContext,
          includeSummaries: options.includeSummaries,
          timestamp: new Date().toISOString(),
        });

        searchResults = await pdfService.search(message, { topK: options.topK });
        const searchDuration = Date.now() - searchStart;

        console.log('🔍 [RAG DETAILED DEBUG] Search completed:', {
          queryHash: queryHash,
          resultsCount: searchResults.length,
          searchDuration: `${searchDuration}ms`,
          topSimilarities: searchResults.slice(0, 5).map(r => r.similarity.toFixed(4)),
          chunkIds: searchResults.slice(0, 3).map(r => r.chunk.id),
          documentTitles: searchResults.slice(0, 3).map(r => r.document.title),
        });

        if (searchResults.length > 0) {
          console.log(`📚 Using ${searchResults.length} context chunks for RAG`);
          // Log first result for debugging
          console.log('🔍 [RAG DEBUG] First result:', {
            document: searchResults[0].document.title,
            similarity: searchResults[0].similarity,
            chunkLength: searchResults[0].chunk.content.length
          });

          // Si graphe activé, récupérer documents liés
          if (options.useGraphContext) {
            const uniqueDocIds = [...new Set(searchResults.map(r => r.document.id))];
            const relatedDocIds = await this.getRelatedDocumentsFromGraph(
              uniqueDocIds,
              options.additionalGraphDocs || 3
            );

            console.log(`🔗 Found ${relatedDocIds.size} related documents via graph`);

            // Récupérer les documents complets
            const vectorStore = pdfService.getVectorStore();
            if (vectorStore && relatedDocIds.size > 0) {
              relatedDocuments = Array.from(relatedDocIds)
                .map(id => vectorStore.getDocument(id))
                .filter(doc => doc !== null);
            }
          }

          // Si résumés activés, utiliser résumés au lieu de chunks
          if (options.includeSummaries) {
            console.log('📝 Using document summaries instead of chunks');
            // Remplacer chunks par résumés
            searchResults = this.convertChunksToSummaries(searchResults);
            if (relatedDocuments.length > 0) {
              // Ajouter résumés des documents liés
              relatedDocuments.forEach(doc => {
                if (doc.summary) {
                  searchResults.push({
                    document: doc,
                    chunk: { content: doc.summary, pageNumber: 1 },
                    similarity: 0.7, // Score arbitraire pour documents liés
                    isRelatedDoc: true
                  });
                }
              });
            }
          }
        }
      }

      // Apply intelligent compression to context chunks
      if (searchResults.length > 0) {
        const preCompressionSize = searchResults.reduce((sum, r) => sum + r.chunk.content.length, 0);
        console.log(`🗜️  [COMPRESSION] Pre-compression context size: ${preCompressionSize} chars (${searchResults.length} chunks)`);

        // Convert search results to compressor format
        const chunksForCompression = searchResults.map(r => ({
          content: r.chunk.content,
          documentId: r.document.id,
          documentTitle: r.document.title,
          pageNumber: r.chunk.pageNumber,
          similarity: r.similarity,
        }));

        // Compress with 20k char target
        const compressionResult = this.compressor.compress(chunksForCompression, message, 20000);

        // Convert back to search result format
        searchResults = compressionResult.chunks.map(chunk => ({
          document: {
            id: chunk.documentId,
            title: chunk.documentTitle,
          },
          chunk: {
            content: chunk.content,
            pageNumber: chunk.pageNumber,
          },
          similarity: chunk.similarity,
        }));

        console.log(`✅ [COMPRESSION] Final stats:`, {
          strategy: compressionResult.stats.strategy,
          originalChunks: compressionResult.stats.originalChunks,
          compressedChunks: compressionResult.stats.compressedChunks,
          originalSize: compressionResult.stats.originalSize,
          compressedSize: compressionResult.stats.compressedSize,
          reduction: `${compressionResult.stats.reductionPercent.toFixed(1)}%`,
        });
      }

      // Récupérer le contexte du projet
      const projectContext = pdfService.getProjectContext();

      // Stream la réponse avec contexte RAG si disponible
      if (searchResults.length > 0) {
        console.log('✅ [RAG DETAILED DEBUG] Generating response WITH context:', {
          queryHash: queryHash,
          contextsUsed: searchResults.length,
          avgSimilarity: (searchResults.reduce((sum, r) => sum + r.similarity, 0) / searchResults.length).toFixed(4),
          mode: 'RAG_WITH_SOURCES',
          projectContextLoaded: !!projectContext,
        });

        // Utiliser generateResponseStreamWithSources pour RAG
        const generator = ollamaClient.generateResponseStreamWithSources(message, searchResults, projectContext);
        this.currentStream = generator;

        for await (const chunk of generator) {
          fullResponse += chunk;
          // Envoyer le chunk au renderer si une fenêtre est fournie
          if (options.window) {
            options.window.webContents.send('chat:stream', chunk);
          }
        }
      } else {
        console.warn('⚠️  [RAG DETAILED DEBUG] No search results - generating response WITHOUT context');
        console.warn('⚠️  [RAG DETAILED DEBUG] Fallback mode details:', {
          queryHash: queryHash,
          query: message.substring(0, 100),
          contextRequested: options.context,
          topK: options.topK,
          mode: 'FALLBACK_NO_CONTEXT',
          warning: 'This response will be GENERIC and NOT based on your documents!',
        });

        const generator = ollamaClient.generateResponseStream(message, []);
        this.currentStream = generator;

        for await (const chunk of generator) {
          fullResponse += chunk;
          // Envoyer le chunk au renderer si une fenêtre est fournie
          if (options.window) {
            options.window.webContents.send('chat:stream', chunk);
          }
        }
      }

      const totalDuration = Date.now() - startTime;

      console.log('✅ [RAG DETAILED DEBUG] Chat response completed:', {
        queryHash: queryHash,
        responseLength: fullResponse.length,
        totalDuration: `${totalDuration}ms`,
        ragUsed: searchResults.length > 0,
        timestamp: new Date().toISOString(),
      });

      // Log chat messages and AI operation to history
      const hm = historyService.getHistoryManager();
      if (hm) {
        // Log user message
        hm.logChatMessage({
          role: 'user',
          content: message,
        });

        // Log assistant response with sources
        const sources =
          searchResults.length > 0
            ? searchResults.map((r) => ({
                documentId: r.document.id,
                documentTitle: r.document.title,
                author: r.document.author,
                year: r.document.year,
                pageNumber: r.chunk.pageNumber,
                similarity: r.similarity,
                isRelatedDoc: r.isRelatedDoc || false,
              }))
            : undefined;

        hm.logChatMessage({
          role: 'assistant',
          content: fullResponse,
          sources,
        });

        // Log RAG operation if context was used
        if (options.context && searchResults.length > 0) {
          const ollamaClient = pdfService.getOllamaClient();

          hm.logAIOperation({
            operationType: 'rag_query',
            durationMs: totalDuration,
            inputText: message,
            inputMetadata: {
              topK: options.topK,
              useGraphContext: options.useGraphContext || false,
              includeSummaries: options.includeSummaries || false,
              sourcesFound: searchResults.length,
              relatedDocumentsFound: relatedDocuments.length,
            },
            modelName: ollamaClient?.chatModel || 'unknown',
            modelParameters: {
              temperature: 0.1,
              // Add other parameters if accessible
            },
            outputText: fullResponse,
            outputMetadata: {
              sources: sources || [],
              responseLength: fullResponse.length,
            },
            success: true,
          });

          console.log(
            `📝 Logged RAG query: ${searchResults.length} sources, ${totalDuration}ms`
          );
        }
      }

      return fullResponse;
    } catch (error) {
      console.error('❌ [RAG DETAILED DEBUG] Chat error:', {
        queryHash: queryHash,
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  cancelCurrentStream() {
    if (this.currentStream) {
      // TODO: Implémenter cancel dans OllamaClient si nécessaire
      this.currentStream = null;
      console.log('⚠️  Chat stream cancelled');
    }
  }
}

export const chatService = new ChatService();
