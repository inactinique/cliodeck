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

  constructor(baseURL: string = 'http://localhost:11434') {
    this.baseURL = baseURL;
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

    const data: OllamaModelsResponse = await response.json();

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

  async generateEmbedding(text: string): Promise<Float32Array> {
    const url = `${this.baseURL}/api/embeddings`;

    const request: OllamaEmbeddingRequest = {
      model: this.embeddingModel,
      prompt: text,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding error: ${response.status}`);
    }

    const data: OllamaEmbeddingResponse = await response.json();
    return new Float32Array(data.embedding);
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

    const data: OllamaGenerateResponse = await response.json();
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
