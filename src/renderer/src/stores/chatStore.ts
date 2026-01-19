import { create } from 'zustand';
import { logger } from '../utils/logger';

// MARK: - Types

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  timestamp: Date;
}

export interface ChatSource {
  documentId: string;
  documentTitle: string;
  author?: string;
  year?: string;
  pageNumber: number;
  chunkContent: string;
  similarity: number;
}

interface ChatState {
  // Messages
  messages: ChatMessage[];
  isProcessing: boolean;
  currentStreamingMessage: string;

  // Filters
  selectedDocumentIds: string[];

  // Actions
  sendMessage: (query: string) => Promise<void>;
  cancelGeneration: () => void;
  clearChat: () => void;

  setSelectedDocuments: (documentIds: string[]) => void;

  // Internal
  addUserMessage: (content: string) => void;
  addAssistantMessage: (content: string, sources?: ChatSource[]) => void;
}

// MARK: - Store

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isProcessing: false,
  currentStreamingMessage: '',
  selectedDocumentIds: [],

  addUserMessage: (content: string) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    set((state) => ({
      messages: [...state.messages, userMessage],
    }));
  },

  addAssistantMessage: (content: string, sources?: ChatSource[]) => {
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content,
      sources,
      timestamp: new Date(),
    };

    set((state) => ({
      messages: [...state.messages, assistantMessage],
      isProcessing: false,
      currentStreamingMessage: '',
    }));
  },

  sendMessage: async (query: string) => {
    logger.store('Chat', 'sendMessage called', { query });
    const { addUserMessage, addAssistantMessage } = get();

    // Add user message
    logger.store('Chat', 'Adding user message');
    addUserMessage(query);

    // Set processing
    set({ isProcessing: true });

    try {
      // Get RAG query parameters from store
      const { useRAGQueryStore } = await import('./ragQueryStore');
      const ragParams = useRAGQueryStore.getState().params;

      // Setup stream listener
      let streamedContent = '';
      logger.store('Chat', 'Setting up stream listener');
      window.electron.chat.onStream((chunk: string) => {
        logger.store('Chat', 'Received stream chunk', { chunkLength: chunk.length });
        streamedContent += chunk;
        set({ currentStreamingMessage: streamedContent });
      });

      // Call IPC to send chat message with context enabled and RAG parameters
      // Map selectedCollectionKeys to collectionKeys for IPC
      const { selectedCollectionKeys, ...otherRagParams } = ragParams;
      const ipcOptions = {
        context: true,
        ...otherRagParams,
        collectionKeys: selectedCollectionKeys?.length > 0 ? selectedCollectionKeys : undefined,
      };
      logger.ipc('chat.send', { query, ipcOptions });
      const result = await window.electron.chat.send(query, ipcOptions);
      logger.ipc('chat.send response', result);

      // Add assistant message with the response
      if (result.success && result.response) {
        logger.store('Chat', 'Adding assistant response', { responseLength: result.response.length });
        addAssistantMessage(result.response);
      } else {
        logger.error('Chat', 'No response or error: ' + (result.error || 'Réponse vide'));
        addAssistantMessage(`Erreur: ${result.error || 'Réponse vide'}`);
      }
    } catch (error: any) {
      logger.error('Chat', error);
      addAssistantMessage(`Erreur: ${error.message || error}`);
    } finally {
      set({ isProcessing: false, currentStreamingMessage: '' });
    }
  },

  cancelGeneration: async () => {
    try {
      await window.electron.chat.cancel();
      set({
        isProcessing: false,
        currentStreamingMessage: '',
      });
    } catch (error) {
      console.error('Failed to cancel generation:', error);
    }
  },

  clearChat: () => {
    set({
      messages: [],
      isProcessing: false,
      currentStreamingMessage: '',
    });
  },

  setSelectedDocuments: (documentIds: string[]) => {
    set({ selectedDocumentIds: documentIds });
  },
}));
