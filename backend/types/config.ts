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
  summarizer: SummarizerConfig;
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
}

export const DEFAULT_CONFIG: AppConfig = {
  llm: {
    backend: 'ollama',
    ollamaURL: 'http://localhost:11434',
    ollamaEmbeddingModel: 'nomic-embed-text',
    ollamaChatModel: 'gemma2:2b',
  },
  rag: {
    topK: 10,
    similarityThreshold: 0.2,
    chunkingConfig: 'cpuOptimized',
    summarizer: {
      enabled: true,
      method: 'extractive',
      maxLength: 250, // ~250 mots = 1 paragraphe
      llmModel: 'gemma2:2b', // Pour abstractif si activé
    },
  },
  editor: {
    fontSize: 14,
    theme: 'dark',
    wordWrap: true,
    showMinimap: true,
  },
  recentProjects: [],
};
