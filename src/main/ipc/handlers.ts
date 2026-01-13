import { ipcMain, dialog, BrowserWindow } from 'electron';
import path from 'path';
import { configManager } from '../services/config-manager.js';
import { projectManager } from '../services/project-manager.js';
import { pdfService } from '../services/pdf-service.js';
import { bibliographyService } from '../services/bibliography-service.js';
import { chatService } from '../services/chat-service.js';
import { zoteroService } from '../services/zotero-service.js';
import { pdfExportService } from '../services/pdf-export.js';
import { wordExportService } from '../services/word-export.js';
import { revealJsExportService } from '../services/revealjs-export.js';
import { historyService } from '../services/history-service.js';

/**
 * Setup all IPC handlers
 */
export function setupIPCHandlers() {
  console.log('🔧 Setting up IPC handlers with debugging...');

  // Configuration handlers
  ipcMain.handle('config:get', (_event, key: string) => {
    console.log('📞 IPC Call: config:get', { key });
    const result = configManager.get(key as any);
    console.log('📤 IPC Response: config:get', result);
    return result;
  });

  ipcMain.handle('config:set', async (_event, key: string, value: any) => {
    console.log('📞 IPC Call: config:set', { key, value });
    configManager.set(key as any, value);

    // If LLM config changed and there's an active project, reinitialize services
    if (key === 'llm') {
      const currentProjectPath = pdfService.getCurrentProjectPath();
      if (currentProjectPath) {
        console.log('🔄 Reinitializing services with new LLM config...');
        try {
          await pdfService.init(currentProjectPath);
          console.log('✅ Services reinitialized successfully');
        } catch (error) {
          console.error('❌ Failed to reinitialize services:', error);
        }
      }
    }

    console.log('📤 IPC Response: config:set - success');
    return { success: true };
  });

  ipcMain.handle('config:get-all', () => {
    console.log('📞 IPC Call: config:get-all');
    const result = configManager.getAll();
    console.log('📤 IPC Response: config:get-all');
    return result;
  });

  // Ollama handlers
  ipcMain.handle('ollama:list-models', async () => {
    console.log('📞 IPC Call: ollama:list-models');
    try {
      const ollamaClient = pdfService.getOllamaClient();
      if (!ollamaClient) {
        throw new Error('Ollama client not initialized - load a project first');
      }

      const models = await ollamaClient.listAvailableModels();
      console.log('📤 IPC Response: ollama:list-models', { count: models.length });
      return { success: true, models };
    } catch (error: any) {
      console.error('❌ ollama:list-models error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('ollama:check-availability', async () => {
    console.log('📞 IPC Call: ollama:check-availability');
    try {
      const ollamaClient = pdfService.getOllamaClient();
      if (!ollamaClient) {
        return { success: true, available: false };
      }

      const available = await ollamaClient.isAvailable();
      console.log('📤 IPC Response: ollama:check-availability', { available });
      return { success: true, available };
    } catch (error: any) {
      console.error('❌ ollama:check-availability error:', error);
      return { success: false, error: error.message, available: false };
    }
  });

  // Project handlers
  ipcMain.handle('project:get-recent', () => {
    console.log('📞 IPC Call: project:get-recent');
    const result = configManager.getRecentProjects();
    console.log('📤 IPC Response: project:get-recent', result);
    return result;
  });

  ipcMain.handle('project:remove-recent', (_event, path: string) => {
    console.log('📞 IPC Call: project:remove-recent', { path });
    configManager.removeRecentProject(path);
    console.log('📤 IPC Response: project:remove-recent success');
    return { success: true };
  });

  ipcMain.handle('project:create', async (_event, data: any) => {
    console.log('📞 IPC Call: project:create', data);
    try {
      const result = await projectManager.createProject(data);
      console.log('📤 IPC Response: project:create', result);
      return result;
    } catch (error: any) {
      console.error('❌ project:create error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('project:load', async (_event, path: string) => {
    console.log('📞 IPC Call: project:load', { path });
    try {
      const result = await projectManager.loadProject(path);

      // Initialize history service if project loaded successfully
      if (result.success) {
        const projectPath = projectManager.getCurrentProjectPath();
        if (projectPath) {
          await historyService.init(projectPath);
        }
      }

      console.log('📤 IPC Response: project:load', result.success ? 'success' : 'failed');
      return result;
    } catch (error: any) {
      console.error('❌ project:load error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('project:close', async () => {
    console.log('📞 IPC Call: project:close');
    try {
      // Close History Service (ends session and closes DB)
      historyService.close();

      // Close PDF Service and free resources
      pdfService.close();

      console.log('📤 IPC Response: project:close - success');
      return { success: true };
    } catch (error: any) {
      console.error('❌ project:close error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('project:save', async (_event, data: any) => {
    console.log('📞 IPC Call: project:save', { path: data.path, contentLength: data.content?.length });
    try {
      const result = await projectManager.saveProject(data);
      console.log('📤 IPC Response: project:save', result);
      return result;
    } catch (error: any) {
      console.error('❌ project:save error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('project:get-chapters', async (_event, projectId: string) => {
    console.log('📞 IPC Call: project:get-chapters', { projectId });
    try {
      const result = await projectManager.getChapters(projectId);
      console.log('📤 IPC Response: project:get-chapters', result);
      return result;
    } catch (error: any) {
      console.error('❌ project:get-chapters error:', error);
      return { success: false, chapters: [], error: error.message };
    }
  });

  ipcMain.handle('project:set-bibliography-source', async (_event, data: any) => {
    console.log('📞 IPC Call: project:set-bibliography-source', data);
    try {
      const result = await projectManager.setBibliographySource(data);
      console.log('📤 IPC Response: project:set-bibliography-source', result);
      return result;
    } catch (error: any) {
      console.error('❌ project:set-bibliography-source error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('project:set-csl-path', async (_event, data: any) => {
    console.log('📞 IPC Call: project:set-csl-path', data);
    try {
      const result = await projectManager.setCSLPath(data);
      console.log('📤 IPC Response: project:set-csl-path', result);
      return result;
    } catch (error: any) {
      console.error('❌ project:set-csl-path error:', error);
      return { success: false, error: error.message };
    }
  });

  // PDF handlers (project-scoped)
  ipcMain.handle('pdf:index', async (event, filePath: string, bibtexKey?: string) => {
    console.log('📞 IPC Call: pdf:index', { filePath, bibtexKey });
    const startTime = Date.now();

    try {
      // Récupérer le projet actuel
      const projectPath = projectManager.getCurrentProjectPath();
      if (!projectPath) {
        console.error('❌ No project currently open');
        return {
          success: false,
          error: 'No project is currently open. Please open or create a project first.',
        };
      }

      console.log('📁 Using project path:', projectPath);

      // Initialiser le service pour ce projet
      await pdfService.init(projectPath);

      const window = BrowserWindow.fromWebContents(event.sender);

      const document = await pdfService.indexPDF(filePath, bibtexKey, (progress) => {
        // Envoyer les updates de progression au renderer
        if (window) {
          window.webContents.send('pdf:indexing-progress', progress);
        }
      });

      const durationMs = Date.now() - startTime;

      // Log PDF operation to history
      const hm = historyService.getHistoryManager();
      if (hm) {
        hm.logPDFOperation({
          operationType: 'import',
          documentId: document.id,
          filePath: path.basename(filePath),
          pageCount: document.pageCount,
          chunksCreated: (document as any).chunkCount || 0,
          citationsExtracted: (document as any).citationsCount || 0,
          durationMs,
          metadata: {
            title: document.title,
            author: document.author,
            year: document.year,
            bibtexKey: bibtexKey || document.bibtexKey,
          },
        });

        console.log(
          `📝 Logged PDF import: ${document.title} (${document.pageCount} pages, ${durationMs}ms)`
        );
      }

      console.log('📤 IPC Response: pdf:index success');
      return { success: true, document };
    } catch (error: any) {
      console.error('❌ pdf:index error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('pdf:search', async (_event, query: string, options?: any) => {
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      if (!projectPath) {
        return { success: false, results: [], error: 'No project is currently open. Please open or create a project first.' };
      }

      await pdfService.init(projectPath);
      const results = await pdfService.search(query, options);
      return { success: true, results };
    } catch (error: any) {
      console.error('❌ pdf:search error:', error);
      return { success: false, results: [], error: error.message };
    }
  });

  ipcMain.handle('pdf:delete', async (_event, documentId: string) => {
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      if (!projectPath) {
        return { success: false, error: 'No project is currently open. Please open or create a project first.' };
      }

      await pdfService.init(projectPath);
      await pdfService.deleteDocument(documentId);
      return { success: true };
    } catch (error: any) {
      console.error('❌ pdf:delete error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('pdf:purge', async () => {
    console.log('📞 IPC Call: pdf:purge');
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      if (!projectPath) {
        return { success: false, error: 'No project is currently open. Please open or create a project first.' };
      }

      await pdfService.init(projectPath);
      pdfService.purgeAllData();
      console.log('📤 IPC Response: pdf:purge - success');
      return { success: true };
    } catch (error: any) {
      console.error('❌ pdf:purge error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('pdf:get-all', async (_event) => {
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      if (!projectPath) {
        return { success: false, documents: [], error: 'No project is currently open. Please open or create a project first.' };
      }

      await pdfService.init(projectPath);
      const documents = await pdfService.getAllDocuments();
      return { success: true, documents };
    } catch (error: any) {
      console.error('❌ pdf:get-all error:', error);
      return { success: false, documents: [], error: error.message };
    }
  });

  ipcMain.handle('pdf:get-statistics', async (_event) => {
    console.log('📞 IPC Call: pdf:get-statistics');
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      if (!projectPath) {
        console.log('⚠️ No project currently open');
        return { success: false, statistics: { totalDocuments: 0, totalChunks: 0, totalEmbeddings: 0 }, error: 'No project is currently open.' };
      }

      console.log('📁 Using project path:', projectPath);
      await pdfService.init(projectPath);
      const stats = await pdfService.getStatistics();
      console.log('📤 IPC Response: pdf:get-statistics', stats);
      // Map backend names to frontend names
      const statistics = {
        totalDocuments: stats.documentCount,
        totalChunks: stats.chunkCount,
        totalEmbeddings: stats.embeddingCount,
        databasePath: stats.databasePath
      };
      return { success: true, statistics };
    } catch (error: any) {
      console.error('❌ pdf:get-statistics error:', error);
      return { success: false, statistics: { totalDocuments: 0, totalChunks: 0, totalEmbeddings: 0 }, error: error.message };
    }
  });

  // Chat handlers (project-scoped)
  ipcMain.handle('chat:send', async (event, message: string, options?: any) => {
    console.log('📞 IPC Call: chat:send', { message: message.substring(0, 50) + '...', options });
    try {
      // Initialiser le service PDF pour ce projet (nécessaire pour le RAG)
      if (options?.context) {
        const projectPath = projectManager.getCurrentProjectPath();
        console.log('🔍 [RAG DEBUG] Current project path:', projectPath);

        if (projectPath) {
          console.log('🔍 [RAG DEBUG] Initializing PDF service for:', projectPath);
          await pdfService.init(projectPath);
          console.log('✅ [RAG DEBUG] PDF service initialized successfully');

          // Test search to verify RAG is working
          const stats = await pdfService.getStatistics();
          console.log('🔍 [RAG DEBUG] Vector DB statistics:', stats);
        } else {
          console.warn('⚠️  [RAG DEBUG] No project path - RAG will not be used');
        }
      } else {
        console.log('🔍 [RAG DEBUG] Context not requested - RAG disabled');
      }

      const window = BrowserWindow.fromWebContents(event.sender);

      // Load RAG config and merge with passed options
      const ragConfig = configManager.getRAGConfig();
      const enrichedOptions = {
        context: options?.context,
        topK: options?.topK || ragConfig.topK,
        includeSummaries: ragConfig.includeSummaries || false,
        useGraphContext: ragConfig.useGraphContext || false,
        additionalGraphDocs: ragConfig.additionalGraphDocs || 3,
        window,
        // Per-query parameters (from RAG settings panel)
        model: options?.model, // Chat model override
        timeout: options?.timeout, // Timeout override
        temperature: options?.temperature,
        top_p: options?.top_p,
        top_k: options?.top_k,
        repeat_penalty: options?.repeat_penalty,
      };

      console.log('🔍 [RAG DEBUG] Enriched options:', enrichedOptions);

      const response = await chatService.sendMessage(message, enrichedOptions);

      console.log('📤 IPC Response: chat:send', { responseLength: response.length });
      return { success: true, response };
    } catch (error: any) {
      console.error('❌ chat:send error:', error);
      return { success: false, response: '', error: error.message };
    }
  });

  ipcMain.handle('chat:cancel', async () => {
    try {
      chatService.cancelCurrentStream();
      return { success: true };
    } catch (error: any) {
      console.error('❌ chat:cancel error:', error);
      return { success: false, error: error.message };
    }
  });

  // Bibliography handlers
  ipcMain.handle('bibliography:load', async (_event, filePath: string) => {
    try {
      const citations = await bibliographyService.loadFromFile(filePath);
      return { success: true, citations };
    } catch (error: any) {
      console.error('❌ bibliography:load error:', error);
      return { success: false, citations: [], error: error.message };
    }
  });

  ipcMain.handle('bibliography:parse', async (_event, content: string) => {
    try {
      const citations = await bibliographyService.parseContent(content);
      return { success: true, citations };
    } catch (error: any) {
      console.error('❌ bibliography:parse error:', error);
      return { success: false, citations: [], error: error.message };
    }
  });

  ipcMain.handle('bibliography:search', async (_event, query: string) => {
    try {
      const citations = bibliographyService.searchCitations(query);
      return { success: true, citations };
    } catch (error: any) {
      console.error('❌ bibliography:search error:', error);
      return { success: false, citations: [], error: error.message };
    }
  });

  // Editor handlers
  ipcMain.handle('editor:load-file', async (_event, filePath: string) => {
    console.log('📞 IPC Call: editor:load-file', { filePath });
    try {
      const { readFile } = await import('fs/promises');
      const content = await readFile(filePath, 'utf-8');
      console.log('📤 IPC Response: editor:load-file', { contentLength: content.length });
      return { success: true, content };
    } catch (error: any) {
      console.error('❌ editor:load-file error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(
    'editor:save-file',
    async (_event, filePath: string, content: string, previousContent?: string) => {
      console.log('📞 IPC Call: editor:save-file', { filePath, contentLength: content.length });
      try {
        const { writeFile } = await import('fs/promises');
        await writeFile(filePath, content, 'utf-8');

        // Log document operation to history
        const hm = historyService.getHistoryManager();
        if (hm) {
          const projectPath = projectManager.getCurrentProjectPath();
          const relativePath = projectPath
            ? path.relative(projectPath, filePath)
            : filePath;

          // Calculate diff
          const newWords = content.split(/\s+/).filter((w) => w.length > 0).length;
          const oldWords = previousContent
            ? previousContent.split(/\s+/).filter((w) => w.length > 0).length
            : 0;

          const wordsAdded = Math.max(0, newWords - oldWords);
          const wordsDeleted = Math.max(0, oldWords - newWords);
          const charactersAdded = Math.max(0, content.length - (previousContent?.length || 0));
          const charactersDeleted = Math.max(
            0,
            (previousContent?.length || 0) - content.length
          );

          hm.logDocumentOperation({
            operationType: 'save',
            filePath: relativePath,
            wordsAdded,
            wordsDeleted,
            charactersAdded,
            charactersDeleted,
          });

          console.log(
            `📝 Logged document save: ${relativePath} (+${wordsAdded}w, -${wordsDeleted}w)`
          );
        }

        console.log('📤 IPC Response: editor:save-file - success');
        return { success: true };
      } catch (error: any) {
        console.error('❌ editor:save-file error:', error);
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle('editor:insert-text', async (event, text: string) => {
    console.log('📞 IPC Call: editor:insert-text', { textLength: text.length });
    // Envoyer au renderer pour insertion dans l'éditeur
    const window = BrowserWindow.fromWebContents(event.sender);
    if (window) {
      window.webContents.send('editor:insert-text-command', text);
      console.log('📤 IPC Response: editor:insert-text - command sent');
    }
    return { success: true };
  });

  // File system handlers
  ipcMain.handle('fs:read-directory', async (_event, dirPath: string) => {
    console.log('📞 IPC Call: fs:read-directory', { dirPath });
    try {
      const { readdir, stat } = await import('fs/promises');
      const path = await import('path');

      const entries = await readdir(dirPath);
      const items = await Promise.all(
        entries.map(async (name) => {
          const fullPath = path.join(dirPath, name);
          try {
            const stats = await stat(fullPath);
            return {
              name,
              path: fullPath,
              isDirectory: stats.isDirectory(),
              isFile: stats.isFile(),
            };
          } catch (error) {
            console.warn(`⚠️ Could not stat ${fullPath}:`, error);
            return null;
          }
        })
      );

      // Filter out null entries and sort: directories first, then files
      const validItems = items.filter((item): item is NonNullable<typeof item> => item !== null);
      const sorted = validItems.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      console.log('📤 IPC Response: fs:read-directory', { itemCount: sorted.length });
      return { success: true, items: sorted };
    } catch (error: any) {
      console.error('❌ fs:read-directory error:', error);
      return { success: false, items: [], error: error.message };
    }
  });

  ipcMain.handle('fs:exists', async (_event, filePath: string) => {
    console.log('📞 IPC Call: fs:exists', { filePath });
    try {
      const { access } = await import('fs/promises');
      await access(filePath);
      console.log('📤 IPC Response: fs:exists - true');
      return true;
    } catch {
      console.log('📤 IPC Response: fs:exists - false');
      return false;
    }
  });

  ipcMain.handle('fs:read-file', async (_event, filePath: string) => {
    console.log('📞 IPC Call: fs:read-file', { filePath });
    try {
      const { readFile } = await import('fs/promises');
      const content = await readFile(filePath, 'utf-8');
      console.log('📤 IPC Response: fs:read-file', { contentLength: content.length });
      return content;
    } catch (error: any) {
      console.error('❌ fs:read-file error:', error);
      throw error;
    }
  });

  ipcMain.handle('fs:write-file', async (_event, filePath: string, content: string) => {
    console.log('📞 IPC Call: fs:write-file', { filePath, contentLength: content.length });
    try {
      const { writeFile } = await import('fs/promises');
      await writeFile(filePath, content, 'utf-8');
      console.log('📤 IPC Response: fs:write-file - success');
      return { success: true };
    } catch (error: any) {
      console.error('❌ fs:write-file error:', error);
      throw error;
    }
  });

  ipcMain.handle('fs:copy-file', async (_event, sourcePath: string, targetPath: string) => {
    console.log('📞 IPC Call: fs:copy-file', { sourcePath, targetPath });
    try {
      const { copyFile } = await import('fs/promises');
      await copyFile(sourcePath, targetPath);
      console.log('📤 IPC Response: fs:copy-file - success');
      return { success: true };
    } catch (error: any) {
      console.error('❌ fs:copy-file error:', error);
      throw error;
    }
  });

  // Dialog handlers
  ipcMain.handle('dialog:open-file', async (_event, options: any) => {
    console.log('📞 IPC Call: dialog:open-file', options);
    const result = await dialog.showOpenDialog(options);
    console.log('📤 IPC Response: dialog:open-file', { canceled: result.canceled, fileCount: result.filePaths?.length });
    return result;
  });

  ipcMain.handle('dialog:save-file', async (_event, options: any) => {
    console.log('📞 IPC Call: dialog:save-file', options);
    const result = await dialog.showSaveDialog(options);
    console.log('📤 IPC Response: dialog:save-file', { canceled: result.canceled, filePath: result.filePath });
    return result;
  });

  // Zotero handlers
  ipcMain.handle('zotero:test-connection', async (_event, userId: string, apiKey: string) => {
    console.log('📞 IPC Call: zotero:test-connection', { userId });
    try {
      const result = await zoteroService.testConnection(userId, apiKey);
      console.log('📤 IPC Response: zotero:test-connection', result);
      return result;
    } catch (error: any) {
      console.error('❌ zotero:test-connection error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('zotero:list-collections', async (_event, userId: string, apiKey: string) => {
    console.log('📞 IPC Call: zotero:list-collections', { userId });
    try {
      const result = await zoteroService.listCollections(userId, apiKey);
      console.log('📤 IPC Response: zotero:list-collections', {
        success: result.success,
        collectionCount: result.collections?.length,
      });
      return result;
    } catch (error: any) {
      console.error('❌ zotero:list-collections error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('zotero:sync', async (_event, options: any) => {
    console.log('📞 IPC Call: zotero:sync', {
      userId: options.userId,
      collectionKey: options.collectionKey,
      downloadPDFs: options.downloadPDFs,
      exportBibTeX: options.exportBibTeX,
    });
    try {
      const result = await zoteroService.sync(options);
      console.log('📤 IPC Response: zotero:sync', {
        success: result.success,
        itemCount: result.itemCount,
        pdfCount: result.pdfCount,
      });
      return result;
    } catch (error: any) {
      console.error('❌ zotero:sync error:', error);
      return { success: false, error: error.message };
    }
  });

  // PDF Export handlers
  ipcMain.handle('pdf-export:check-dependencies', async () => {
    console.log('📞 IPC Call: pdf-export:check-dependencies');
    try {
      const result = await pdfExportService.checkDependencies();
      console.log('📤 IPC Response: pdf-export:check-dependencies', result);
      return { success: true, ...result };
    } catch (error: any) {
      console.error('❌ pdf-export:check-dependencies error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('pdf-export:export', async (event, options: any) => {
    console.log('📞 IPC Call: pdf-export:export', {
      projectType: options.projectType,
      hasBibliography: !!options.bibliographyPath,
    });
    try {
      const window = BrowserWindow.fromWebContents(event.sender);

      const result = await pdfExportService.exportToPDF(options, (progress) => {
        if (window) {
          window.webContents.send('pdf-export:progress', progress);
        }
      });

      console.log('📤 IPC Response: pdf-export:export', {
        success: result.success,
        outputPath: result.outputPath,
      });
      return result;
    } catch (error: any) {
      console.error('❌ pdf-export:export error:', error);
      return { success: false, error: error.message };
    }
  });

  // Word Export handlers
  ipcMain.handle('word-export:export', async (event, options: any) => {
    console.log('📞 IPC Call: word-export:export', {
      projectType: options.projectType,
      hasBibliography: !!options.bibliographyPath,
      hasTemplate: !!options.templatePath,
    });
    try {
      const window = BrowserWindow.fromWebContents(event.sender);

      const result = await wordExportService.exportToWord(options, (progress) => {
        if (window) {
          window.webContents.send('word-export:progress', progress);
        }
      });

      console.log('📤 IPC Response: word-export:export', {
        success: result.success,
        outputPath: result.outputPath,
      });
      return result;
    } catch (error: any) {
      console.error('❌ word-export:export error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('word-export:find-template', async (_event, projectPath: string) => {
    console.log('📞 IPC Call: word-export:find-template', { projectPath });
    try {
      const templatePath = await wordExportService.findTemplate(projectPath);
      console.log('📤 IPC Response: word-export:find-template', { templatePath });
      return { success: true, templatePath };
    } catch (error: any) {
      console.error('❌ word-export:find-template error:', error);
      return { success: false, error: error.message };
    }
  });

  // Reveal.js Export handlers
  ipcMain.handle('revealjs-export:export', async (event, options: any) => {
    console.log('📞 IPC Call: revealjs-export:export', {
      projectType: options.projectType,
      hasConfig: !!options.config,
    });
    try {
      const window = BrowserWindow.fromWebContents(event.sender);

      const result = await revealJsExportService.exportToRevealJs(options, (progress) => {
        if (window) {
          window.webContents.send('revealjs-export:progress', progress);
        }
      });

      console.log('📤 IPC Response: revealjs-export:export', {
        success: result.success,
        outputPath: result.outputPath,
      });
      return result;
    } catch (error: any) {
      console.error('❌ revealjs-export:export error:', error);
      return { success: false, error: error.message };
    }
  });

  // Corpus Explorer handlers (Knowledge Graph)
  ipcMain.handle('corpus:get-graph', async (_event, options?: any) => {
    console.log('📞 IPC Call: corpus:get-graph', options);
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      if (!projectPath) {
        return { success: false, error: 'No project is currently open. Please open or create a project first.' };
      }

      await pdfService.init(projectPath);
      const graphData = await pdfService.buildKnowledgeGraph(options);

      console.log('📤 IPC Response: corpus:get-graph', {
        nodeCount: graphData.nodes.length,
        edgeCount: graphData.edges.length,
      });
      return { success: true, graph: graphData };
    } catch (error: any) {
      console.error('❌ corpus:get-graph error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('corpus:get-statistics', async (_event) => {
    console.log('📞 IPC Call: corpus:get-statistics');
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      if (!projectPath) {
        return { success: false, error: 'No project is currently open. Please open or create a project first.' };
      }

      await pdfService.init(projectPath);
      const statistics = await pdfService.getCorpusStatistics();

      console.log('📤 IPC Response: corpus:get-statistics', statistics);
      return { success: true, statistics };
    } catch (error: any) {
      console.error('❌ corpus:get-statistics error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('corpus:analyze-topics', async (_event, options?: any) => {
    console.log('📞 IPC Call: corpus:analyze-topics', options);
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      if (!projectPath) {
        return { success: false, error: 'No project is currently open. Please open or create a project first.' };
      }

      await pdfService.init(projectPath);
      const result = await pdfService.analyzeTopics(options);

      console.log('📤 IPC Response: corpus:analyze-topics', {
        topicCount: result.topics.length,
        documentCount: result.topicAssignments ? Object.keys(result.topicAssignments).length : 0,
      });
      return { success: true, ...result };
    } catch (error: any) {
      console.error('❌ corpus:analyze-topics error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('corpus:load-topics', async () => {
    console.log('📞 IPC Call: corpus:load-topics');
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      if (!projectPath) {
        return { success: false, error: 'No project is currently open. Please open or create a project first.' };
      }

      await pdfService.init(projectPath);
      const result = pdfService.loadTopicAnalysis();

      if (result) {
        console.log('📤 IPC Response: corpus:load-topics', {
          topicCount: result.topics.length,
          documentCount: result.topicAssignments ? Object.keys(result.topicAssignments).length : 0,
          analysisDate: result.analysisDate,
        });
        return { success: true, ...result };
      } else {
        console.log('📤 IPC Response: corpus:load-topics - no saved analysis');
        return { success: false, error: 'No saved topic analysis found' };
      }
    } catch (error: any) {
      console.error('❌ corpus:load-topics error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('corpus:get-topic-timeline', async () => {
    console.log('📞 IPC Call: corpus:get-topic-timeline');
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      if (!projectPath) {
        return { success: false, error: 'No project is currently open. Please open or create a project first.' };
      }

      await pdfService.init(projectPath);
      const timeline = pdfService.getTopicTimeline();

      if (timeline) {
        console.log('📤 IPC Response: corpus:get-topic-timeline', {
          yearCount: timeline.length,
          yearRange: timeline.length > 0 ? `${timeline[0].year}-${timeline[timeline.length - 1].year}` : 'N/A',
        });
        return { success: true, timeline };
      } else {
        console.log('📤 IPC Response: corpus:get-topic-timeline - no timeline data');
        return { success: false, error: 'No topic timeline data found' };
      }
    } catch (error: any) {
      console.error('❌ corpus:get-topic-timeline error:', error);
      return { success: false, error: error.message };
    }
  });

  // Textometrics handlers
  ipcMain.handle('corpus:get-text-statistics', async (_event, options?: any) => {
    console.log('📞 IPC Call: corpus:get-text-statistics', options);
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      if (!projectPath) {
        return { success: false, error: 'No project is currently open. Please open or create a project first.' };
      }

      await pdfService.init(projectPath);
      const statistics = await pdfService.getTextStatistics(options);

      console.log('📤 IPC Response: corpus:get-text-statistics', {
        totalWords: statistics.totalWords,
        vocabularySize: statistics.vocabularySize,
        topWordsCount: statistics.topWords?.length || 0,
      });
      return { success: true, statistics };
    } catch (error: any) {
      console.error('❌ corpus:get-text-statistics error:', error);
      return { success: false, error: error.message };
    }
  });

  // History handlers
  ipcMain.handle('history:get-sessions', async () => {
    console.log('📞 IPC Call: history:get-sessions');
    try {
      const hm = historyService.getHistoryManager();
      if (!hm) {
        return { success: false, sessions: [], error: 'No project open' };
      }

      const sessions = hm.getAllSessions();
      console.log('📤 IPC Response: history:get-sessions', { count: sessions.length });
      return { success: true, sessions };
    } catch (error: any) {
      console.error('❌ history:get-sessions error:', error);
      return { success: false, sessions: [], error: error.message };
    }
  });

  ipcMain.handle('history:get-events', async (_event, sessionId: string) => {
    console.log('📞 IPC Call: history:get-events', { sessionId });
    try {
      const hm = historyService.getHistoryManager();
      if (!hm) {
        return { success: false, events: [], error: 'No project open' };
      }

      const events = hm.getEventsForSession(sessionId);
      console.log('📤 IPC Response: history:get-events', { count: events.length });
      return { success: true, events };
    } catch (error: any) {
      console.error('❌ history:get-events error:', error);
      return { success: false, events: [], error: error.message };
    }
  });

  ipcMain.handle('history:get-chat-history', async (_event, sessionId: string) => {
    console.log('📞 IPC Call: history:get-chat-history', { sessionId });
    try {
      const hm = historyService.getHistoryManager();
      if (!hm) {
        return { success: false, messages: [], error: 'No project open' };
      }

      const messages = hm.getChatMessagesForSession(sessionId);
      console.log('📤 IPC Response: history:get-chat-history', { count: messages.length });
      return { success: true, messages };
    } catch (error: any) {
      console.error('❌ history:get-chat-history error:', error);
      return { success: false, messages: [], error: error.message };
    }
  });

  ipcMain.handle('history:get-ai-operations', async (_event, sessionId: string) => {
    console.log('📞 IPC Call: history:get-ai-operations', { sessionId });
    try {
      const hm = historyService.getHistoryManager();
      if (!hm) {
        return { success: false, operations: [], error: 'No project open' };
      }

      const operations = hm.getAIOperationsForSession(sessionId);
      console.log('📤 IPC Response: history:get-ai-operations', { count: operations.length });
      return { success: true, operations };
    } catch (error: any) {
      console.error('❌ history:get-ai-operations error:', error);
      return { success: false, operations: [], error: error.message };
    }
  });

  ipcMain.handle(
    'history:export-report',
    async (_event, sessionId: string, format: 'markdown' | 'json' | 'latex') => {
      console.log('📞 IPC Call: history:export-report', { sessionId, format });
      try {
        const hm = historyService.getHistoryManager();
        if (!hm) {
          return { success: false, error: 'No project open' };
        }

        const report = hm.exportSessionReport(sessionId, format);
        console.log('📤 IPC Response: history:export-report', {
          format,
          length: report.length,
        });
        return { success: true, report };
      } catch (error: any) {
        console.error('❌ history:export-report error:', error);
        return { success: false, error: error.message };
      }
    }
  );

  ipcMain.handle('history:get-statistics', async () => {
    console.log('📞 IPC Call: history:get-statistics');
    try {
      const hm = historyService.getHistoryManager();
      if (!hm) {
        return { success: false, error: 'No project open' };
      }

      const statistics = hm.getStatistics();
      console.log('📤 IPC Response: history:get-statistics', statistics);
      return { success: true, statistics };
    } catch (error: any) {
      console.error('❌ history:get-statistics error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('history:search-events', async (_event, filters: any) => {
    console.log('📞 IPC Call: history:search-events', filters);
    try {
      const hm = historyService.getHistoryManager();
      if (!hm) {
        return { success: false, events: [], error: 'No project open' };
      }

      // Convert date strings to Date objects if present
      if (filters.startDate) filters.startDate = new Date(filters.startDate);
      if (filters.endDate) filters.endDate = new Date(filters.endDate);

      const events = hm.searchEvents(filters);
      console.log('📤 IPC Response: history:search-events', { count: events.length });
      return { success: true, events };
    } catch (error: any) {
      console.error('❌ history:search-events error:', error);
      return { success: false, events: [], error: error.message };
    }
  });

  console.log('✅ IPC handlers registered');
}
