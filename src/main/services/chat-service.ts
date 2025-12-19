// @ts-nocheck
import { pdfService } from './pdf-service.js';
import { BrowserWindow } from 'electron';

class ChatService {
  private currentStream: any = null;

  async sendMessage(
    message: string,
    options: { context?: boolean; window?: BrowserWindow } = {}
  ): Promise<string> {
    try {
      // Obtenir le client Ollama
      const ollamaClient = pdfService.getOllamaClient();
      if (!ollamaClient) {
        throw new Error('Ollama client not initialized');
      }

      let fullResponse = '';
      let contextText = '';

      // Si contexte activé, rechercher dans les documents
      if (options.context) {
        const searchResults = await pdfService.search(message, { topK: 5 });

        if (searchResults.length > 0) {
          contextText = searchResults
            .map((r: any) => r.text)
            .join('\n\n---\n\n');

          console.log(`📚 Using ${searchResults.length} context chunks for RAG`);
        }
      }

      // Construire le prompt avec contexte
      const systemPrompt = contextText
        ? `Tu es un assistant d'écriture pour historiens. Utilise le contexte suivant pour répondre à la question de l'utilisateur.

CONTEXTE:
${contextText}

Réponds de manière précise et cite les sources quand c'est pertinent.`
        : 'Tu es un assistant d\'écriture pour historiens.';

      // Stream la réponse
      this.currentStream = await ollamaClient.chat(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message },
        ],
        {
          stream: true,
          onChunk: (chunk: string) => {
            fullResponse += chunk;
            // Envoyer le chunk au renderer si une fenêtre est fournie
            if (options.window) {
              options.window.webContents.send('chat:stream', chunk);
            }
          },
        }
      );

      console.log(`✅ Chat response generated (${fullResponse.length} chars)`);
      return fullResponse;
    } catch (error) {
      console.error('❌ Chat error:', error);
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
