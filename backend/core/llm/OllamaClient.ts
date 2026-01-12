import type { SearchResult } from '../../types/pdf-document';
import http from 'http';
import { getSystemPrompt, getDefaultSystemPrompt } from './SystemPrompts.js';

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
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
    seed?: number;
    num_predict?: number;
  };
}

interface OllamaGenerateResponse {
  response: string;
  done: boolean;
}

// MARK: - OllamaClient

// Presets de génération pour différents cas d'usage
export const GENERATION_PRESETS = {
  // Pour recherche académique (RECOMMANDÉ pour cohérence)
  academic: {
    temperature: 0.1,      // Quasi-déterministe
    top_p: 0.85,          // Réduit la variance
    top_k: 40,            // Limite les choix
    repeat_penalty: 1.1,  // Évite les répétitions
    seed: 42,             // Reproductible
  },

  // Pour brainstorming/créatif
  creative: {
    temperature: 0.8,
    top_p: 0.95,
    top_k: 80,
    repeat_penalty: 1.0,
  },

  // Déterminisme absolu (debug)
  deterministic: {
    temperature: 0.0,     // Toujours exactement la même réponse
    seed: 12345,
  }
};

export class OllamaClient {
  private baseURL: string;
  public embeddingModel: string = 'nomic-embed-text';
  public chatModel: string = 'gemma2:2b';

  // Limite de caractères pour nomic-embed-text
  // Modèle supporte 8192 tokens ≈ 5000-6000 chars
  // On utilise 3500 chars comme limite sécuritaire (laisse marge pour contexte document)
  private readonly NOMIC_MAX_LENGTH = 3500;

  constructor(
    baseURL: string = 'http://127.0.0.1:11434',
    chatModel?: string,
    embeddingModel?: string
  ) {
    this.baseURL = baseURL;
    if (chatModel) this.chatModel = chatModel;
    if (embeddingModel) this.embeddingModel = embeddingModel;
  }

  /**
   * Helper method to make HTTP GET requests using Node.js http module
   * More reliable than fetch in Electron main process
   */
  private httpGet(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const request = http.get(url, (response) => {
        let data = '';

        response.on('data', (chunk) => {
          data += chunk;
        });

        response.on('end', () => {
          try {
            if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
              resolve(JSON.parse(data));
            } else {
              reject(new Error(`HTTP ${response.statusCode}: ${data}`));
            }
          } catch (error) {
            reject(error);
          }
        });
      });

      request.on('error', (error) => {
        reject(error);
      });

      request.setTimeout(5000, () => {
        request.destroy();
        reject(new Error('Request timeout'));
      });
    });
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

    try {
      console.log('🔍 Fetching Ollama models from:', url);
      console.log('   Using Node.js http module (more reliable in Electron)');

      const data = await this.httpGet(url) as OllamaModelsResponse;
      console.log('✅ Successfully fetched', data.models.length, 'models');

      // Convertir les modèles Ollama en LLMModel
      return data.models.map((model) => ({
        id: model.name,
        name: model.name,
        size: this.formatSize(model.size),
        description: 'Modèle Ollama',
        recommendedFor: this.inferRecommendations(model.name),
      }));
    } catch (error: any) {
      console.error('❌ Failed to fetch Ollama models:', error.message);
      console.error('   URL attempted:', url);
      console.error('   Base URL:', this.baseURL);
      throw error;
    }
  }

  // MARK: - Génération d'embeddings

  /**
   * Découpe un texte en chunks de taille maximale (sentence-aware)
   */
  private chunkText(text: string, maxLength: number): string[] {
    if (text.length <= maxLength) {
      return [text];
    }

    const chunks: string[] = [];
    let currentIndex = 0;

    while (currentIndex < text.length) {
      let endIndex = Math.min(currentIndex + maxLength, text.length);

      // Try to find sentence boundary if not at end
      if (endIndex < text.length) {
        // Look backward up to 200 chars for sentence ending
        const searchStart = Math.max(currentIndex, endIndex - 200);
        const searchText = text.substring(searchStart, endIndex);
        const sentenceEndings = /[.!?;](?=\s|$)/g;
        let lastMatch = null;
        let match;

        while ((match = sentenceEndings.exec(searchText)) !== null) {
          lastMatch = match;
        }

        if (lastMatch) {
          // Cut at last sentence boundary
          endIndex = searchStart + lastMatch.index + 1;
        }
      }

      const chunk = text.substring(currentIndex, endIndex).trim();
      chunks.push(chunk);
      currentIndex = endIndex;
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

  async *generateResponseStream(
    prompt: string,
    context: string[],
    modelOverride?: string,
    timeoutOverride?: number,
    generationOptions?: Partial<typeof GENERATION_PRESETS.academic>,
    systemPrompt?: string
  ): AsyncGenerator<string> {
    const url = `${this.baseURL}/api/generate`;

    const fullPrompt = this.buildPrompt(prompt, context, systemPrompt);

    const model = modelOverride || this.chatModel;
    const timeout = timeoutOverride || 600000;
    const options = { ...GENERATION_PRESETS.academic, ...generationOptions };

    const request: OllamaGenerateRequest = {
      model,
      prompt: fullPrompt,
      stream: true,
      options,
    };

    console.log('🔍 [OLLAMA DEBUG] Calling Ollama API (no sources):', {
      url,
      model,
      timeout: `${timeout / 1000}s`,
      promptLength: fullPrompt.length,
      contextCount: context.length,
      generationParams: request.options,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(timeout),
      // @ts-ignore - undici-specific options
      headersTimeout: timeout, // Wait for headers as long as the main timeout
      bodyTimeout: timeout, // Wait for body chunks as long as the main timeout
    });

    if (!response.ok || !response.body) {
      console.error('❌ [OLLAMA DEBUG] Ollama API error:', {
        status: response.status,
        statusText: response.statusText,
        url,
        model
      });
      throw new Error(`Ollama streaming error: ${response.status} - Model: ${model}`);
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
    sources: SearchResult[],
    projectContext?: string,
    modelOverride?: string,
    timeoutOverride?: number,
    generationOptions?: Partial<typeof GENERATION_PRESETS.academic>,
    systemPrompt?: string
  ): AsyncGenerator<string> {
    const url = `${this.baseURL}/api/generate`;

    const fullPrompt = this.buildPromptWithSources(prompt, sources, projectContext, systemPrompt);

    const model = modelOverride || this.chatModel;
    const timeout = timeoutOverride || 600000;
    const options = { ...GENERATION_PRESETS.academic, ...generationOptions };

    const request: OllamaGenerateRequest = {
      model,
      prompt: fullPrompt,
      stream: true,
      options,
    };

    console.log('🔍 [OLLAMA DEBUG] Calling Ollama API:', {
      url,
      model,
      timeout: `${timeout / 1000}s`,
      promptLength: fullPrompt.length,
      sourceCount: sources.length,
      generationParams: request.options,
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(timeout),
      // @ts-ignore - undici-specific options
      headersTimeout: timeout, // Wait for headers as long as the main timeout
      bodyTimeout: timeout, // Wait for body chunks as long as the main timeout
    });

    if (!response.ok || !response.body) {
      console.error('❌ [OLLAMA DEBUG] Ollama API error:', {
        status: response.status,
        statusText: response.statusText,
        url,
        model
      });
      throw new Error(`Ollama streaming error: ${response.status} - Model: ${model}`);
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

  private buildPrompt(userQuery: string, context: string[], systemPrompt?: string): string {
    // Use provided system prompt, or fallback to French default for backwards compatibility
    const systemInstruction = systemPrompt || getDefaultSystemPrompt('fr');

    if (context.length === 0) {
      return userQuery;
    }

    let prompt = `${systemInstruction}

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

  private buildPromptWithSources(userQuery: string, sources: SearchResult[], projectContext?: string, systemPrompt?: string): string {
    // Use provided system prompt, or fallback to French default for backwards compatibility
    const systemInstruction = systemPrompt || getDefaultSystemPrompt('fr');

    if (sources.length === 0) {
      // Si aucune source ET aucun projet, message d'erreur
      if (!projectContext) {
        return `ERREUR: Aucun projet chargé et aucun document disponible.

Pour utiliser cet assistant, vous devez :
1. Charger un projet (File → Open Project)
2. Indexer des documents PDF dans ce projet

Sans projet ni documents, je ne peux pas vous aider.`;
      }
      // Si projet mais pas de sources
      return userQuery;
    }

    let prompt = `${systemInstruction}
`;

    // 🆕 Ajouter le contexte du projet si disponible
    if (projectContext) {
      prompt += `\nCONTEXTE DU PROJET:
${projectContext}

`;
    }

    prompt += `Voici des extraits pertinents des documents indexés :

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

IMPORTANT : Réponds de manière précise et académique en te basant sur les extraits fournis. Lorsque tu utilises une information d'un extrait, cite TOUJOURS la source de manière explicite.

Pour chaque citation, utilise le format complet avec l'auteur (ou titre si pas d'auteur), l'année ET la page. Exemples :
- "Selon Smith (2020, p. 45), la question centrale est..."
- "Cette approche est confirmée par les recherches récentes (Johnson, 2019, p. 12)"
- "Comme le note l'auteur (Database Meets AI, 2021, p. 8)..."

Liste des sources disponibles :`;

    // Ajouter une liste claire des sources à la fin
    sources.forEach((source, index) => {
      const doc = source.document;
      let ref = '';
      if (doc.author) {
        ref = `${doc.author}${doc.year ? ` (${doc.year})` : ''}`;
      } else {
        ref = `${doc.title}${doc.year ? ` (${doc.year})` : ''}`;
      }
      prompt += `\n  - Source ${index + 1}: ${ref}`;
    });

    prompt += `\n\nSi les extraits ne contiennent pas l'information nécessaire pour répondre à la question, dis-le clairement.`;

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
