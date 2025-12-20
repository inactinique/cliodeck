import { create } from 'zustand';
import { logger } from '../utils/logger';

// MARK: - Types

export interface EditorSettings {
  fontSize: number;
  theme: 'light' | 'dark';
  wordWrap: boolean;
  showPreview: boolean;
  previewPosition: 'right' | 'bottom';
  showMinimap: boolean;
  fontFamily: string;
}

interface EditorState {
  // Content
  content: string;
  filePath: string | null;
  isDirty: boolean;

  // Settings
  settings: EditorSettings;

  // Preview
  showPreview: boolean;

  // Actions
  setContent: (content: string) => void;
  loadFile: (filePath: string) => Promise<void>;
  saveFile: () => Promise<void>;
  saveFileAs: (filePath: string) => Promise<void>;

  updateSettings: (settings: Partial<EditorSettings>) => void;
  togglePreview: () => void;

  insertText: (text: string) => void;
  insertCitation: (citationKey: string) => void;
}

// MARK: - Default settings

const DEFAULT_SETTINGS: EditorSettings = {
  fontSize: 14,
  theme: 'dark',
  wordWrap: true,
  showPreview: false,
  previewPosition: 'right',
  showMinimap: true,
  fontFamily: 'system',
};

// MARK: - Store

export const useEditorStore = create<EditorState>((set, get) => ({
  content: '',
  filePath: null,
  isDirty: false,
  settings: DEFAULT_SETTINGS,
  showPreview: false,

  setContent: (content: string) => {
    set({
      content,
      isDirty: true,
    });
  },

  loadFile: async (filePath: string) => {
    logger.store('Editor', 'loadFile called', { filePath });
    try {
      logger.ipc('editor.loadFile', { filePath });
      const result = await window.electron.editor.loadFile(filePath);
      logger.ipc('editor.loadFile response', result);

      if (result.success && result.content !== undefined) {
        set({
          content: result.content,
          filePath,
          isDirty: false,
        });
        logger.store('Editor', 'File loaded successfully', { contentLength: result.content.length });
      } else {
        throw new Error(result.error || 'Failed to load file');
      }
    } catch (error) {
      logger.error('Editor', error);
      throw error;
    }
  },

  saveFile: async () => {
    const { content, filePath } = get();
    logger.store('Editor', 'saveFile called', { filePath, contentLength: content.length });

    if (!filePath) {
      throw new Error('No file path specified. Use saveFileAs instead.');
    }

    try {
      logger.ipc('editor.saveFile', { filePath, contentLength: content.length });
      const result = await window.electron.editor.saveFile(filePath, content);
      logger.ipc('editor.saveFile response', result);

      if (result.success) {
        set({ isDirty: false });
        logger.store('Editor', 'File saved successfully');
      } else {
        throw new Error(result.error || 'Failed to save file');
      }
    } catch (error) {
      logger.error('Editor', error);
      throw error;
    }
  },

  saveFileAs: async (newFilePath: string) => {
    const { content } = get();
    logger.store('Editor', 'saveFileAs called', { newFilePath, contentLength: content.length });

    try {
      logger.ipc('editor.saveFile', { filePath: newFilePath, contentLength: content.length });
      const result = await window.electron.editor.saveFile(newFilePath, content);
      logger.ipc('editor.saveFile response', result);

      if (result.success) {
        set({
          filePath: newFilePath,
          isDirty: false,
        });
        logger.store('Editor', 'File saved successfully as', { newFilePath });
      } else {
        throw new Error(result.error || 'Failed to save file');
      }
    } catch (error) {
      logger.error('Editor', error);
      throw error;
    }
  },

  updateSettings: (newSettings: Partial<EditorSettings>) => {
    set((state) => ({
      settings: {
        ...state.settings,
        ...newSettings,
      },
    }));
  },

  togglePreview: () => {
    set((state) => ({
      showPreview: !state.showPreview,
    }));
  },

  insertText: (text: string) => {
    set((state) => ({
      content: state.content + text,
      isDirty: true,
    }));
  },

  insertCitation: (citationKey: string) => {
    const citationText = `[@${citationKey}]`;
    get().insertText(citationText);
  },
}));
