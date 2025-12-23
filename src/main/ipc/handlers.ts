import { ipcMain, dialog, BrowserWindow } from 'electron';
import { configManager } from '../services/config-manager.js';
import { projectManager } from '../services/project-manager.js';
import { pdfService } from '../services/pdf-service.js';
import { bibliographyService } from '../services/bibliography-service.js';
import { chatService } from '../services/chat-service.js';
import { zoteroService } from '../services/zotero-service.js';
import { pdfExportService } from '../services/pdf-export.js';
import { revealJsExportService } from '../services/revealjs-export.js';

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

  ipcMain.handle('config:set', (_event, key: string, value: any) => {
    console.log('📞 IPC Call: config:set', { key, value });
    configManager.set(key as any, value);
    console.log('📤 IPC Response: config:set - success');
    return { success: true };
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
      console.log('📤 IPC Response: project:load', result.success ? 'success' : 'failed');
      return result;
    } catch (error: any) {
      console.error('❌ project:load error:', error);
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

  // PDF handlers
  ipcMain.handle('pdf:index', async (event, filePath: string, bibtexKey?: string) => {
    console.log('📞 IPC Call: pdf:index', { filePath, bibtexKey });
    try {
      const window = BrowserWindow.fromWebContents(event.sender);

      const document = await pdfService.indexPDF(filePath, bibtexKey, (progress) => {
        // Envoyer les updates de progression au renderer
        if (window) {
          window.webContents.send('pdf:indexing-progress', progress);
        }
      });

      console.log('📤 IPC Response: pdf:index success');
      return { success: true, document };
    } catch (error: any) {
      console.error('❌ pdf:index error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('pdf:search', async (_event, query: string, options?: any) => {
    try {
      const results = await pdfService.search(query, options);
      return { success: true, results };
    } catch (error: any) {
      console.error('❌ pdf:search error:', error);
      return { success: false, results: [], error: error.message };
    }
  });

  ipcMain.handle('pdf:delete', async (_event, documentId: string) => {
    try {
      await pdfService.deleteDocument(documentId);
      return { success: true };
    } catch (error: any) {
      console.error('❌ pdf:delete error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('pdf:get-all', async () => {
    try {
      const documents = await pdfService.getAllDocuments();
      return { success: true, documents };
    } catch (error: any) {
      console.error('❌ pdf:get-all error:', error);
      return { success: false, documents: [], error: error.message };
    }
  });

  ipcMain.handle('pdf:get-statistics', async () => {
    console.log('📞 IPC Call: pdf:get-statistics');
    try {
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

  // Chat handlers
  ipcMain.handle('chat:send', async (event, message: string, options?: any) => {
    console.log('📞 IPC Call: chat:send', { message: message.substring(0, 50) + '...', options });
    try {
      const window = BrowserWindow.fromWebContents(event.sender);

      const response = await chatService.sendMessage(message, {
        ...options,
        window,
      });

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

  ipcMain.handle('editor:save-file', async (_event, filePath: string, content: string) => {
    console.log('📞 IPC Call: editor:save-file', { filePath, contentLength: content.length });
    try {
      const { writeFile } = await import('fs/promises');
      await writeFile(filePath, content, 'utf-8');
      console.log('📤 IPC Response: editor:save-file - success');
      return { success: true };
    } catch (error: any) {
      console.error('❌ editor:save-file error:', error);
      return { success: false, error: error.message };
    }
  });

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

  console.log('✅ IPC handlers registered');
}
