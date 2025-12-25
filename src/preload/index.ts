import { contextBridge, ipcRenderer } from 'electron';

// API exposée au renderer process
const api = {
  // Projects
  project: {
    create: (data: any) => ipcRenderer.invoke('project:create', data),
    load: (path: string) => ipcRenderer.invoke('project:load', path),
    save: (data: any) => ipcRenderer.invoke('project:save', data),
    getRecent: () => ipcRenderer.invoke('project:get-recent'),
    removeRecent: (path: string) => ipcRenderer.invoke('project:remove-recent', path),
    getChapters: (projectId: string) => ipcRenderer.invoke('project:get-chapters', projectId),
    setBibliographySource: (data: {
      projectPath: string;
      type: 'file' | 'zotero';
      filePath?: string;
      zoteroCollection?: string;
    }) => ipcRenderer.invoke('project:set-bibliography-source', data),
  },

  // PDF & Documents
  pdf: {
    index: (filePath: string, bibtexKey?: string) =>
      ipcRenderer.invoke('pdf:index', filePath, bibtexKey),
    search: (query: string, options?: any) =>
      ipcRenderer.invoke('pdf:search', query, options),
    delete: (documentId: string) =>
      ipcRenderer.invoke('pdf:delete', documentId),
    getAll: () => ipcRenderer.invoke('pdf:get-all'),
    getStatistics: () => ipcRenderer.invoke('pdf:get-statistics'),
  },

  // Chat RAG
  chat: {
    send: (message: string, options?: any) =>
      ipcRenderer.invoke('chat:send', message, options),
    onStream: (callback: (chunk: string) => void) => {
      ipcRenderer.on('chat:stream', (_event, chunk) => callback(chunk));
    },
    cancel: () => ipcRenderer.invoke('chat:cancel'),
  },

  // Bibliography
  bibliography: {
    load: (filePath: string) => ipcRenderer.invoke('bibliography:load', filePath),
    parse: (content: string) => ipcRenderer.invoke('bibliography:parse', content),
    search: (query: string) => ipcRenderer.invoke('bibliography:search', query),
  },

  // Editor
  editor: {
    loadFile: (filePath: string) => ipcRenderer.invoke('editor:load-file', filePath),
    saveFile: (filePath: string, content: string) =>
      ipcRenderer.invoke('editor:save-file', filePath, content),
    insertText: (text: string) => ipcRenderer.invoke('editor:insert-text', text),
    onInsertText: (callback: (text: string) => void) => {
      ipcRenderer.on('editor:insert-text-command', (_event, text) => callback(text));
    },
  },

  // Configuration
  config: {
    get: (key: string) => ipcRenderer.invoke('config:get', key),
    set: (key: string, value: any) => ipcRenderer.invoke('config:set', key, value),
  },

  // Dialogs
  dialog: {
    openFile: (options: any) => ipcRenderer.invoke('dialog:open-file', options),
    saveFile: (options: any) => ipcRenderer.invoke('dialog:save-file', options),
  },

  // File system
  fs: {
    readDirectory: (dirPath: string) => ipcRenderer.invoke('fs:read-directory', dirPath),
    exists: (filePath: string) => ipcRenderer.invoke('fs:exists', filePath),
    readFile: (filePath: string) => ipcRenderer.invoke('fs:read-file', filePath),
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:write-file', filePath, content),
  },

  // Zotero
  zotero: {
    testConnection: (userId: string, apiKey: string) =>
      ipcRenderer.invoke('zotero:test-connection', userId, apiKey),
    listCollections: (userId: string, apiKey: string) =>
      ipcRenderer.invoke('zotero:list-collections', userId, apiKey),
    sync: (options: {
      userId: string;
      apiKey: string;
      collectionKey?: string;
      downloadPDFs: boolean;
      exportBibTeX: boolean;
    }) => ipcRenderer.invoke('zotero:sync', options),
  },

  // PDF Export
  pdfExport: {
    checkDependencies: () => ipcRenderer.invoke('pdf-export:check-dependencies'),
    export: (options: {
      projectPath: string;
      projectType: 'notes' | 'article' | 'book' | 'presentation';
      content: string;
      outputPath?: string;
      bibliographyPath?: string;
      metadata?: {
        title?: string;
        author?: string;
        date?: string;
      };
    }) => ipcRenderer.invoke('pdf-export:export', options),
    onProgress: (callback: (progress: any) => void) => {
      const listener = (_event: any, progress: any) => callback(progress);
      ipcRenderer.on('pdf-export:progress', listener);
      return () => ipcRenderer.removeListener('pdf-export:progress', listener);
    },
  },

  // Reveal.js Export
  revealJsExport: {
    export: (options: {
      projectPath: string;
      content: string;
      outputPath?: string;
      metadata?: {
        title?: string;
        author?: string;
        date?: string;
      };
      config?: any;
    }) => ipcRenderer.invoke('revealjs-export:export', options),
    onProgress: (callback: (progress: any) => void) => {
      const listener = (_event: any, progress: any) => callback(progress);
      ipcRenderer.on('revealjs-export:progress', listener);
      return () => ipcRenderer.removeListener('revealjs-export:progress', listener);
    },
  },

  // Corpus Explorer
  corpus: {
    getGraph: (options?: {
      includeSimilarityEdges?: boolean;
      similarityThreshold?: number;
      includeAuthorNodes?: boolean;
      computeLayout?: boolean;
    }) => ipcRenderer.invoke('corpus:get-graph', options),
    getStatistics: () => ipcRenderer.invoke('corpus:get-statistics'),
    analyzeTopics: (options?: {
      minTopicSize?: number;
      language?: string;
      nGramRange?: [number, number];
    }) => ipcRenderer.invoke('corpus:analyze-topics', options),
  },
};

// Exposer l'API au renderer via window.electron
contextBridge.exposeInMainWorld('electron', api);

// Types pour TypeScript
export type ElectronAPI = typeof api;
