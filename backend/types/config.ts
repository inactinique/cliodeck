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

export interface RAGConfig {
  topK: number;
  similarityThreshold: number;
  chunkingConfig: 'cpuOptimized' | 'standard' | 'large';
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
  },
  editor: {
    fontSize: 14,
    theme: 'dark',
    wordWrap: true,
    showMinimap: true,
  },
  recentProjects: [],
};
