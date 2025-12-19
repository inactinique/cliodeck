import { ipcMain, dialog, BrowserWindow } from 'electron';
import { configManager } from '../services/config-manager.js';
import { projectManager } from '../services/project-manager.js';
import { pdfService } from '../services/pdf-service.js';
import { bibliographyService } from '../services/bibliography-service.js';
import { chatService } from '../services/chat-service.js';

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

  // PDF handlers
  ipcMain.handle('pdf:index', async (event, filePath: string, bibtexKey?: string) => {
    try {
      const window = BrowserWindow.fromWebContents(event.sender);

      const document = await pdfService.indexPDF(filePath, bibtexKey, (progress) => {
        // Envoyer les updates de progression au renderer
        if (window) {
          window.webContents.send('pdf:indexing-progress', progress);
        }
      });

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
      const statistics = await pdfService.getStatistics();
      console.log('📤 IPC Response: pdf:get-statistics', statistics);
      return { success: true, statistics };
    } catch (error: any) {
      console.error('❌ pdf:get-statistics error:', error);
      return { success: false, statistics: { totalDocuments: 0, totalChunks: 0 }, error: error.message };
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

  console.log('✅ IPC handlers registered');
}
