// @ts-nocheck
import { pdfService } from './pdf-service.js';
import { BrowserWindow } from 'electron';

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

      // Stream la réponse avec contexte RAG si disponible
      if (searchResults.length > 0) {
        console.log('✅ [RAG DETAILED DEBUG] Generating response WITH context:', {
          queryHash: queryHash,
          contextsUsed: searchResults.length,
          avgSimilarity: (searchResults.reduce((sum, r) => sum + r.similarity, 0) / searchResults.length).toFixed(4),
          mode: 'RAG_WITH_SOURCES',
        });

        // Utiliser generateResponseStreamWithSources pour RAG
        const generator = ollamaClient.generateResponseStreamWithSources(message, searchResults);
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
