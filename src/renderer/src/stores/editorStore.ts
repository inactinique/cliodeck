import { create } from 'zustand';
import type { Editor } from '@milkdown/kit/core';
import { editorViewCtx } from '@milkdown/kit/core';
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

  // Milkdown editor reference
  milkdownEditor: Editor | null;

  // Actions
  setContent: (content: string) => void;
  loadFile: (filePath: string) => Promise<void>;
  saveFile: () => Promise<void>;
  saveFileAs: (filePath: string) => Promise<void>;
  saveCurrentFile: () => Promise<void>;
  createNewFile: () => void;

  updateSettings: (settings: Partial<EditorSettings>) => void;
  togglePreview: () => void;
  toggleStats: () => void;

  insertText: (text: string) => void;
  insertCitation: (citationKey: string) => void;
  insertFormatting: (type: 'bold' | 'italic' | 'link' | 'citation' | 'table' | 'footnote' | 'blockquote') => void;
  insertTextAtCursor: (text: string) => void;
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
  milkdownEditor: null,

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

  toggleStats: () => {
    // Stats are always visible in the new editor, this is a no-op for compatibility
    logger.store('Editor', 'toggleStats called (no-op)');
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

  saveCurrentFile: async () => {
    await get().saveFile();
  },

  createNewFile: () => {
    logger.store('Editor', 'createNewFile called');
    set({
      content: '',
      filePath: null,
      isDirty: false,
    });
  },

  insertFormatting: (type: 'bold' | 'italic' | 'link' | 'citation' | 'table' | 'footnote' | 'blockquote') => {
    logger.store('Editor', 'insertFormatting called', { type });
    const { content } = get();
    let textToInsert = '';

    switch (type) {
      case 'bold':
        textToInsert = '**texte en gras**';
        break;
      case 'italic':
        textToInsert = '_texte en italique_';
        break;
      case 'link':
        textToInsert = '[texte du lien](url)';
        break;
      case 'citation':
        textToInsert = '[@clé_citation]';
        break;
      case 'table':
        textToInsert = '\n| Colonne 1 | Colonne 2 |\n|-----------|----------|\n| Cellule 1 | Cellule 2 |\n';
        break;
      case 'footnote':
        // Count existing footnotes to get the next number
        const footnoteMatches = content.match(/\[\^(\d+)\]/g) || [];
        const nextNumber = footnoteMatches.length + 1;
        textToInsert = `[^${nextNumber}]`;
        break;
      case 'blockquote':
        textToInsert = '\n> Citation ou bloc de texte important\n> Continuation de la citation\n';
        break;
    }

    // Try to insert at cursor position using Milkdown editor
    const editor = get().milkdownEditor;
    if (editor) {
      try {
        editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const { state } = view;
          const { tr, selection } = state;
          tr.insertText(textToInsert, selection.from, selection.to);
          view.dispatch(tr);
          view.focus();
        });
        set({ isDirty: true });
      } catch (error) {
        // Fallback: append to content
        logger.error('Editor', 'Failed to insert at cursor, appending to content');
        set({
          content: content + textToInsert,
          isDirty: true,
        });
      }
    } else {
      // No Milkdown editor, append to content
      set({
        content: content + textToInsert,
        isDirty: true,
      });
    }
  },

  insertTextAtCursor: (text: string) => {
    logger.store('Editor', 'insertTextAtCursor called', { text });
    const editor = get().milkdownEditor;
    if (editor) {
      try {
        editor.action((ctx) => {
          const view = ctx.get(editorViewCtx);
          const { state } = view;
          const { tr, selection } = state;
          tr.insertText(text, selection.from, selection.to);
          view.dispatch(tr);
          view.focus();
        });
        set({ isDirty: true });
      } catch (error) {
        logger.error('Editor', 'Failed to insert text at cursor');
      }
    }
  },
}));
