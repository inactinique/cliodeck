import type { SearchResult } from '../../types/pdf-document';

// MARK: - Types

export interface LLMModel {
  id: string;
  name: string;
  size: string;
  description: string;
  recommendedFor: string[];
}

interface OllamaModelsResponse {
  models: Array<{
    name: string;
    size: number;
    digest: string;
    modified_at: string;
  }>;
}

interface OllamaEmbeddingRequest {
  model: string;
  prompt: string;
}

interface OllamaEmbeddingResponse {
  embedding: number[];
}

interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream: boolean;
}

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

// MARK: - OllamaClient

export class OllamaClient {
  private baseURL: string;
  public embeddingModel: string = 'nomic-embed-text';
  public chatModel: string = 'gemma2:2b';

  // Limite de caractères pour nomic-embed-text (échec entre 2100-2200)
  // On utilise 2000 comme limite sécuritaire
  private readonly NOMIC_MAX_LENGTH = 2000;

  constructor(
    baseURL: string = 'http://localhost:11434',
    chatModel?: string,
    embeddingModel?: string
  ) {
    this.baseURL = baseURL;
    if (chatModel) this.chatModel = chatModel;
    if (embeddingModel) this.embeddingModel = embeddingModel;
  }

  // MARK: - Vérification disponibilité

  async isAvailable(): Promise<boolean> {
    try {
      await this.listAvailableModels();
      return true;
    } catch {
      return false;
    }
  }

  // MARK: - Liste des modèles disponibles

  async listAvailableModels(): Promise<LLMModel[]> {
    const url = `${this.baseURL}/api/tags`;

    const response = await fetch(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status}`);
    }

    const data = await response.json() as OllamaModelsResponse;

    // Convertir les modèles Ollama en LLMModel
    return data.models.map((model) => ({
      id: model.name,
      name: model.name,
      size: this.formatSize(model.size),
      description: 'Modèle Ollama',
      recommendedFor: this.inferRecommendations(model.name),
    }));
  }

  // MARK: - Génération d'embeddings

  /**
   * Découpe un texte en chunks de taille maximale
   */
  private chunkText(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
      const chunk = text.substring(currentIndex, currentIndex + maxLength);
      chunks.push(chunk);
      currentIndex += maxLength;
    }

    return chunks;
  }

  /**
   * Moyenne plusieurs embeddings en un seul
   */
  private averageEmbeddings(embeddings: Float32Array[]): Float32Array {
    if (embeddings.length === 0) {
      throw new Error('Cannot average zero embeddings');
    }

    if (embeddings.length === 1) {
      return embeddings[0];
    }

    const length = embeddings[0].length;
    const averaged = new Float32Array(length);

    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (const embedding of embeddings) {
        sum += embedding[i];
      }
      averaged[i] = sum / embeddings.length;
    }

    return averaged;
  }

  /**
   * Génère un embedding pour un chunk de texte avec un modèle spécifique
   */
  private async generateEmbeddingWithModel(text: string, model: string): Promise<Float32Array> {
    const url = `${this.baseURL}/api/embeddings`;

    const request: OllamaEmbeddingRequest = {
      model: model,
      prompt: text,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Ollama embedding error: ${response.status} ${response.statusText} - ${errorBody}`
      );
    }

    const data = await response.json() as OllamaEmbeddingResponse;
    return new Float32Array(data.embedding);
  }

  /**
   * Génère un embedding pour un chunk de texte (avec fallback automatique)
   */
  private async generateEmbeddingForChunk(text: string): Promise<Float32Array> {
    try {
      // Essayer avec le modèle configuré (nomic-embed-text normalement)
      return await this.generateEmbeddingWithModel(text, this.embeddingModel);
    } catch (error) {
      // Si échec avec nomic-embed-text, fallback vers mxbai-embed-large
      if (this.embeddingModel === 'nomic-embed-text') {
        console.warn('⚠️ nomic-embed-text failed, falling back to mxbai-embed-large');
        console.warn(`   Error: ${error instanceof Error ? error.message : String(error)}`);

        try {
          const result = await this.generateEmbeddingWithModel(text, 'mxbai-embed-large');
          console.log('✅ Fallback to mxbai-embed-large successful');
          return result;
        } catch (fallbackError) {
          console.error('❌ Fallback to mxbai-embed-large also failed:', fallbackError);
          throw fallbackError;
        }
      }

      // Si ce n'est pas nomic ou si le fallback a échoué, propager l'erreur
      throw error;
    }
  }

  /**
   * Génère un embedding pour un texte (avec chunking automatique si nécessaire)
   */
  async generateEmbedding(text: string): Promise<Float32Array> {
    // Pour nomic-embed-text, limiter à 2000 caractères par chunk
    const maxLength = this.embeddingModel === 'nomic-embed-text'
      ? this.NOMIC_MAX_LENGTH
      : 8000; // Pour les autres modèles, utiliser une limite plus haute

    console.log('📤 Sending Ollama embedding request:', {
      url: `${this.baseURL}/api/embeddings`,
      model: this.embeddingModel,
      textLength: text.length,
      textPreview: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
    });

    // Si le texte est court, traitement normal
    if (text.length <= maxLength) {
      const embedding = await this.generateEmbeddingForChunk(text);
      console.log('✅ Ollama embedding received:', {
        embeddingLength: embedding.length,
      });
      return embedding;
    }

    // Sinon, chunking automatique
    const chunks = this.chunkText(text, maxLength);
    console.log(`⚠️ Text too long (${text.length} chars), splitting into ${chunks.length} chunks`);

    const embeddings: Float32Array[] = [];
    for (let i = 0; i < chunks.length; i++) {
      console.log(`   Processing chunk ${i + 1}/${chunks.length} (${chunks[i].length} chars)...`);
      const embedding = await this.generateEmbeddingForChunk(chunks[i]);
      embeddings.push(embedding);
    }

    // Moyenner les embeddings
    const averaged = this.averageEmbeddings(embeddings);
    console.log('✅ Ollama embeddings averaged:', {
      chunks: chunks.length,
      embeddingLength: averaged.length,
    });

    return averaged;
  }

  // MARK: - Génération de réponse (non-streaming)

  async generateResponse(prompt: string, context: string[]): Promise<string> {
    const url = `${this.baseURL}/api/generate`;

    const fullPrompt = this.buildPrompt(prompt, context);

    const request: OllamaGenerateRequest = {
      model: this.chatModel,
      prompt: fullPrompt,
      stream: false,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Ollama generate error: ${response.status}`);
    }

    const data = await response.json() as OllamaGenerateResponse;
    return data.response;
  }

  // MARK: - Génération de réponse (streaming)

  async *generateResponseStream(prompt: string, context: string[]): AsyncGenerator<string> {
    const url = `${this.baseURL}/api/generate`;

    const fullPrompt = this.buildPrompt(prompt, context);

    const request: OllamaGenerateRequest = {
      model: this.chatModel,
      prompt: fullPrompt,
      stream: true,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama streaming error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((l) => l.trim());

        for (const line of lines) {
          try {
            const json: OllamaGenerateResponse = JSON.parse(line);

            if (json.response && json.response.length > 0) {
              yield json.response;
            }

            if (json.done) {
              return;
            }
          } catch (e) {
            // Skip invalid JSON
            console.warn('Invalid JSON chunk:', line);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // MARK: - Génération de réponse avec sources (streaming)

  async *generateResponseStreamWithSources(
    prompt: string,
    sources: SearchResult[]
  ): AsyncGenerator<string> {
    const url = `${this.baseURL}/api/generate`;

    const fullPrompt = this.buildPromptWithSources(prompt, sources);

    const request: OllamaGenerateRequest = {
      model: this.chatModel,
      prompt: fullPrompt,
      stream: true,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama streaming error: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter((l) => l.trim());

        for (const line of lines) {
          try {
            const json: OllamaGenerateResponse = JSON.parse(line);

            if (json.response && json.response.length > 0) {
              yield json.response;
            }

            if (json.done) {
              return;
            }
          } catch (e) {
            // Skip invalid JSON
            console.warn('Invalid JSON chunk:', line);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  // MARK: - Construction du prompt avec RAG

  private buildPrompt(userQuery: string, context: string[]): string {
    if (context.length === 0) {
      return userQuery;
    }

    let prompt = `Tu es un assistant académique spécialisé en sciences humaines et sociales, particulièrement en histoire contemporaine. Tu aides les chercheurs à analyser et comprendre leurs documents PDF.

Voici des extraits pertinents des documents :

`;

    context.forEach((chunk, index) => {
      prompt += `\n[Extrait ${index + 1}]\n${chunk}\n`;
    });

    prompt += `\nQuestion de l'utilisateur : ${userQuery}

Réponds de manière précise et académique en te basant sur les extraits fournis. Si les extraits ne contiennent pas l'information nécessaire, dis-le clairement. Cite les numéros des extraits que tu utilises.`;

    return prompt;
  }

  // MARK: - Construction du prompt avec sources complètes

  private buildPromptWithSources(userQuery: string, sources: SearchResult[]): string {
    if (sources.length === 0) {
      return userQuery;
    }

    let prompt = `Tu es un assistant académique spécialisé en sciences humaines et sociales, particulièrement en histoire contemporaine. Tu aides les chercheurs à analyser et comprendre leurs documents PDF.

Voici des extraits pertinents des documents indexés :

`;

    sources.forEach((source, index) => {
      const doc = source.document;
      const chunk = source.chunk;

      // Construire la référence bibliographique
      let reference = '';
      if (doc.author) {
        reference += doc.author;
      } else {
        reference += doc.title;
      }

      if (doc.year) {
        reference += ` (${doc.year})`;
      }

      prompt += `\n[Source ${index + 1}: ${reference}, p. ${chunk.pageNumber}]\n${chunk.content}\n`;
    });

    prompt += `\nQuestion de l'utilisateur : ${userQuery}

IMPORTANT : Réponds de manière précise et académique en te basant sur les extraits fournis. Lorsque tu utilises une information, cite TOUJOURS la source en utilisant ce format : [Source X] où X est le numéro de la source.

Par exemple : "Selon l'auteur [Source 1], la question centrale est..."

Si les extraits ne contiennent pas l'information nécessaire pour répondre à la question, dis-le clairement.`;

    return prompt;
  }

  // MARK: - Utilitaires

  private formatSize(bytes: number): string {
    const gb = bytes / 1024 ** 3;
    const mb = bytes / 1024 ** 2;
    return gb >= 1 ? `${gb.toFixed(1)}GB` : `${mb.toFixed(0)}MB`;
  }

  private inferRecommendations(modelName: string): string[] {
    const name = modelName.toLowerCase();
    const recommendations: string[] = [];

    if (name.includes('embed')) {
      recommendations.push('embeddings');
    } else {
      recommendations.push('chat');
    }

    if (
      name.includes('gemma') ||
      name.includes('phi') ||
      name.includes(':2b') ||
      name.includes(':3b')
    ) {
      recommendations.push('cpu');
      recommendations.push('fast');
    }

    if (name.includes('mistral') || name.includes('mixtral')) {
      recommendations.push('french');
    }

    if (name.includes('llama')) {
      recommendations.push('multilingual');
    }

    return recommendations;
  }
}

// MARK: - Modèles recommandés

export const RECOMMENDED_EMBEDDING_MODELS: LLMModel[] = [
  {
    id: 'nomic-embed-text',
    name: 'Nomic Embed Text',
    size: '274M',
    description: 'Excellent modèle d\'embeddings, optimisé CPU, 768 dimensions',
    recommendedFor: ['embeddings', 'cpu', 'english', 'multilingual'],
  },
  {
    id: 'mxbai-embed-large',
    name: 'MixedBread Embed Large',
    size: '335M',
    description: 'Très performant, supporte 512 tokens, 1024 dimensions',
    recommendedFor: ['embeddings', 'cpu', 'long-context'],
  },
];

export const RECOMMENDED_CHAT_MODELS: LLMModel[] = [
  // Petits modèles (CPU standard)
  {
    id: 'gemma2:2b',
    name: 'Gemma 2 2B',
    size: '1.6GB',
    description: 'Très rapide sur CPU, bon pour français, Google',
    recommendedFor: ['chat', 'cpu', 'french', 'fast'],
  },
  {
    id: 'phi3:mini',
    name: 'Phi-3 Mini (3.8B)',
    size: '2.3GB',
    description: 'Excellent rapport qualité/vitesse, Microsoft',
    recommendedFor: ['chat', 'cpu', 'academic', 'fast'],
  },

  // Modèles moyens (CPU puissant)
  {
    id: 'mistral:7b-instruct-q4_0',
    name: 'Mistral 7B Instruct (Q4)',
    size: '4.1GB',
    description: 'Très bon en français, quantized pour CPU',
    recommendedFor: ['chat', 'cpu', 'french', 'quality'],
  },
  {
    id: 'llama3.2:3b',
    name: 'Llama 3.2 3B',
    size: '2GB',
    description: 'Récent et performant, Meta',
    recommendedFor: ['chat', 'cpu', 'multilingual'],
  },

  // Modèles plus gros (CPU très puissant ou GPU)
  {
    id: 'mistral:7b-instruct',
    name: 'Mistral 7B Instruct',
    size: '4.1GB',
    description: 'Version complète, meilleure qualité',
    recommendedFor: ['chat', 'quality', 'french'],
  },
  {
    id: 'llama3.1:8b',
    name: 'Llama 3.1 8B',
    size: '4.7GB',
    description: 'Très performant, contexte 128k tokens',
    recommendedFor: ['chat', 'quality', 'long-context'],
  },
];
