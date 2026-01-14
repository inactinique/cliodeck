export interface LLMConfig {
  backend: 'ollama' | 'claude' | 'openai';
  ollamaURL: string;
  ollamaEmbeddingModel: string;
  ollamaChatModel: string;
  claudeAPIKey?: string;
  claudeModel?: string;
  openaiAPIKey?: string;
  openaiModel?: string;
}

export interface SummarizerConfig {
  enabled: boolean;
  method: 'extractive' | 'abstractive';
  maxLength: number; // En nombre de mots
  llmModel?: string; // Pour abstractif uniquement
}

export interface RAGConfig {
  topK: number;
  similarityThreshold: number;
  chunkingConfig: 'cpuOptimized' | 'standard' | 'large';
  summarizer?: SummarizerConfig; // Legacy, kept for backwards compatibility

  // Summary generation
  summaryGeneration?: 'extractive' | 'abstractive' | 'disabled';
  summaryMaxLength?: number;

  // Graph context
  useGraphContext?: boolean;
  graphSimilarityThreshold?: number;
  additionalGraphDocs?: number;

  // Exploration graph
  explorationSimilarityThreshold?: number; // Seuil pour les arêtes de similarité dans le graphe d'exploration

  // RAG enrichment
  includeSummaries?: boolean; // Use summaries in RAG instead of chunks

  // Topic modeling
  enableTopicModeling?: boolean;

  // Enhanced search features (Phase 1 improvements)
  useAdaptiveChunking?: boolean; // Use structure-aware chunking
  useHNSWIndex?: boolean; // Use HNSW for fast search
  useHybridSearch?: boolean; // Combine dense (HNSW) + sparse (BM25)

  // System prompt configuration (Phase 2.3)
  systemPromptLanguage?: 'fr' | 'en'; // Language of the default system prompt
  customSystemPrompt?: string; // Custom system prompt (optional)
  useCustomSystemPrompt?: boolean; // Use custom prompt instead of default
}

export interface ZoteroConfig {
  userId?: string;
  groupId?: string;
  apiKey?: string;
}

export interface EditorConfig {
  fontSize: number;
  theme: 'light' | 'dark';
  wordWrap: boolean;
  showMinimap: boolean;
}

export interface AppConfig {
  llm: LLMConfig;
  rag: RAGConfig;
  zotero?: ZoteroConfig;
  editor: EditorConfig;
  recentProjects: string[];
  language?: 'fr' | 'en' | 'de';
}

export const DEFAULT_CONFIG: AppConfig = {
  llm: {
    backend: 'ollama',
    ollamaURL: 'http://127.0.0.1:11434',
    ollamaEmbeddingModel: 'nomic-embed-text',
    ollamaChatModel: 'gemma2:2b',
  },
  rag: {
    topK: 10,
    similarityThreshold: 0.12, // Réduit pour recherche multilingue (FR query → EN docs)
    chunkingConfig: 'cpuOptimized',
    summarizer: {
      enabled: true,
      method: 'extractive',
      maxLength: 750, // ~750 mots = 2-3 paragraphes
      llmModel: 'gemma2:2b', // Pour abstractif si activé
    },
    // Enhanced search features (enabled by default)
    useAdaptiveChunking: true, // Structure-aware chunking
    useHNSWIndex: true, // Fast approximate search
    useHybridSearch: true, // Dense + sparse fusion
    // Exploration graph
    explorationSimilarityThreshold: 0.7, // Seuil de similarité pour le graphe d'exploration
    // System prompt configuration (default: French)
    systemPromptLanguage: 'fr',
    useCustomSystemPrompt: false,
  },
  editor: {
    fontSize: 14,
    theme: 'dark',
    wordWrap: true,
    showMinimap: true,
  },
  recentProjects: [],
  language: 'fr',
};
