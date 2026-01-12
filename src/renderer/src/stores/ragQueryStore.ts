import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// MARK: - Types

export interface RAGQueryParams {
  // Core parameters
  model: string;
  topK: number;
  timeout: number; // in milliseconds

  // Advanced parameters
  temperature: number;
  top_p: number;
  top_k: number;
  repeat_penalty: number;

  // System prompt configuration (Phase 2.3)
  systemPromptLanguage: 'fr' | 'en';
  customSystemPrompt?: string;
  useCustomSystemPrompt: boolean;
}

export interface AvailableModel {
  id: string;
  name: string;
  size: string;
  description?: string;
}

interface RAGQueryState {
  // Query parameters (persisted)
  params: RAGQueryParams;

  // Available models (not persisted, loaded from Ollama)
  availableModels: AvailableModel[];
  isLoadingModels: boolean;

  // UI state (not persisted)
  isSettingsPanelOpen: boolean;

  // Actions
  setParams: (params: Partial<RAGQueryParams>) => void;
  resetToDefaults: () => Promise<void>;
  loadAvailableModels: () => Promise<void>;
  toggleSettingsPanel: () => void;
}

// Default values - will be loaded from global config on first run
const DEFAULT_PARAMS: RAGQueryParams = {
  model: 'gemma2:2b',
  topK: 10,
  timeout: 600000, // 10 minutes

  // Academic preset (from OllamaClient)
  temperature: 0.1,
  top_p: 0.85,
  top_k: 40,
  repeat_penalty: 1.1,

  // System prompt (default: French)
  systemPromptLanguage: 'fr',
  useCustomSystemPrompt: false,
};

// MARK: - Store

export const useRAGQueryStore = create<RAGQueryState>()(
  persist(
    (set, get) => ({
      // Initial state
      params: DEFAULT_PARAMS,
      availableModels: [],
      isLoadingModels: false,
      isSettingsPanelOpen: false,

      // Actions
      setParams: (newParams: Partial<RAGQueryParams>) => {
        set((state) => ({
          params: { ...state.params, ...newParams },
        }));
      },

      resetToDefaults: async () => {
        try {
          // Load defaults from global config
          const config = await window.electron.config.getAll();
          const llmConfig = config.llm;
          const ragConfig = config.rag;

          set({
            params: {
              model: llmConfig.ollamaChatModel || DEFAULT_PARAMS.model,
              topK: ragConfig.topK || DEFAULT_PARAMS.topK,
              timeout: DEFAULT_PARAMS.timeout,
              temperature: DEFAULT_PARAMS.temperature,
              top_p: DEFAULT_PARAMS.top_p,
              top_k: DEFAULT_PARAMS.top_k,
              repeat_penalty: DEFAULT_PARAMS.repeat_penalty,
              systemPromptLanguage: ragConfig.systemPromptLanguage || DEFAULT_PARAMS.systemPromptLanguage,
              customSystemPrompt: ragConfig.customSystemPrompt,
              useCustomSystemPrompt: ragConfig.useCustomSystemPrompt || DEFAULT_PARAMS.useCustomSystemPrompt,
            },
          });

          console.log('✅ RAG query params reset to config defaults');
        } catch (error) {
          // Silently fallback to hardcoded defaults (config might not be ready yet)
          set({ params: DEFAULT_PARAMS });
        }
      },

      loadAvailableModels: async () => {
        set({ isLoadingModels: true });

        try {
          console.log('🔄 Loading available Ollama models...');
          const result = await window.electron.ollama.listModels();

          console.log('📦 Ollama API response:', result);

          if (result.success && result.models) {
            console.log(`📋 All models from Ollama (${result.models.length}):`, result.models.map(m => m.id));

            // Filter only chat models (exclude embedding models)
            const chatModels = result.models.filter(
              (model: AvailableModel) =>
                !model.id.includes('embed') && !model.id.includes('embedding')
            );

            console.log(`✅ Chat models after filtering (${chatModels.length}):`, chatModels.map(m => m.id));

            set({
              availableModels: chatModels,
              isLoadingModels: false,
            });

            console.log(`✅ Loaded ${chatModels.length} chat models from Ollama`);
          } else {
            throw new Error(result.error || 'Failed to load models');
          }
        } catch (error) {
          // Silently handle error - models will be loaded when a project is opened
          console.warn('⚠️  Could not load Ollama models:', error);
          set({
            availableModels: [],
            isLoadingModels: false,
          });
        }
      },

      toggleSettingsPanel: () => {
        set((state) => ({
          isSettingsPanelOpen: !state.isSettingsPanelOpen,
        }));
      },
    }),
    {
      name: 'rag-query-params', // localStorage key
      // Only persist params, not UI state or available models
      partialize: (state) => ({ params: state.params }),
    }
  )
);

// Initialize from config on first load
if (typeof window !== 'undefined') {
  // Load defaults from config on startup
  useRAGQueryStore.getState().resetToDefaults();

  // Don't load models immediately - they'll be loaded when panel opens
  // (Ollama client needs a project to be loaded first)
}
