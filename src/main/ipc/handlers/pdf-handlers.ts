/**
 * PDF indexing and search IPC handlers
 */
import { ipcMain, BrowserWindow } from 'electron';
import path from 'path';
import { projectManager } from '../../services/project-manager.js';
import { pdfService } from '../../services/pdf-service.js';
import { historyService } from '../../services/history-service.js';
import { successResponse, errorResponse, requireProject } from '../utils/error-handler.js';
import { validate, PDFSearchSchema } from '../utils/validation.js';

export function setupPDFHandlers() {
  ipcMain.handle('pdf:extractMetadata', async (_event, filePath: string) => {
    console.log('📞 IPC Call: pdf:extractMetadata', { filePath });
    try {
      const metadata = await pdfService.extractPDFMetadata(filePath);
      console.log('📤 IPC Response: pdf:extractMetadata success', metadata);
      return successResponse({ metadata });
    } catch (error: any) {
      console.error('❌ pdf:extractMetadata error:', error);
      return errorResponse(error);
    }
  });

  ipcMain.handle('pdf:index', async (event, filePath: string, bibtexKey?: string, bibliographyMetadata?: { title?: string; author?: string; year?: string }) => {
    console.log('📞 IPC Call: pdf:index', { filePath, bibtexKey, bibliographyMetadata });
    const startTime = Date.now();

    try {
      const projectPath = projectManager.getCurrentProjectPath();
      requireProject(projectPath);
      console.log('📁 Using project path:', projectPath);

      // Initialize PDF service for this project

      const window = BrowserWindow.fromWebContents(event.sender);

      const document = await pdfService.indexPDF(filePath, bibtexKey, (progress) => {
        // Send progress updates to renderer
        if (window) {
          window.webContents.send('pdf:indexing-progress', progress);
        }
      }, bibliographyMetadata);

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
      return successResponse({ document });
    } catch (error: any) {
      console.error('❌ pdf:index error:', error);
      return errorResponse(error);
    }
  });

  ipcMain.handle('pdf:search', async (_event, query: string, options?: any) => {
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      requireProject(projectPath);

      // Validate search parameters
      const validatedData = validate(PDFSearchSchema, { query, options });

      const results = await pdfService.search(validatedData.query, validatedData.options);
      return successResponse({ results });
    } catch (error: any) {
      console.error('❌ pdf:search error:', error);
      return { ...errorResponse(error), results: [] };
    }
  });

  ipcMain.handle('pdf:delete', async (_event, documentId: string) => {
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      requireProject(projectPath);

      await pdfService.deleteDocument(documentId);
      return successResponse();
    } catch (error: any) {
      console.error('❌ pdf:delete error:', error);
      return errorResponse(error);
    }
  });

  ipcMain.handle('pdf:purge', async () => {
    console.log('📞 IPC Call: pdf:purge');
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      requireProject(projectPath);

      pdfService.purgeAllData();
      console.log('📤 IPC Response: pdf:purge - success');
      return successResponse();
    } catch (error: any) {
      console.error('❌ pdf:purge error:', error);
      return errorResponse(error);
    }
  });

  ipcMain.handle('pdf:clean-orphaned-chunks', async () => {
    console.log('📞 IPC Call: pdf:clean-orphaned-chunks');
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      requireProject(projectPath);

      pdfService.cleanOrphanedChunks();
      console.log('📤 IPC Response: pdf:clean-orphaned-chunks - success');
      return successResponse();
    } catch (error: any) {
      console.error('❌ pdf:clean-orphaned-chunks error:', error);
      return errorResponse(error);
    }
  });

  ipcMain.handle('pdf:get-all', async () => {
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      requireProject(projectPath);

      const documents = await pdfService.getAllDocuments();
      return successResponse({ documents });
    } catch (error: any) {
      console.error('❌ pdf:get-all error:', error);
      return { ...errorResponse(error), documents: [] };
    }
  });

  ipcMain.handle('pdf:get-statistics', async () => {
    console.log('📞 IPC Call: pdf:get-statistics');
    try {
      const projectPath = projectManager.getCurrentProjectPath();
      if (!projectPath) {
        console.log('⚠️ No project currently open');
        return {
          success: false,
          statistics: { totalDocuments: 0, totalChunks: 0, totalEmbeddings: 0 },
          error: 'No project is currently open.',
        };
      }

      console.log('📁 Using project path:', projectPath);
      const stats = await pdfService.getStatistics();
      console.log('📤 IPC Response: pdf:get-statistics', stats);

      // Map backend names to frontend names
      const statistics = {
        totalDocuments: stats.documentCount,
        totalChunks: stats.chunkCount,
        totalEmbeddings: stats.embeddingCount,
        databasePath: stats.databasePath,
      };
      return successResponse({ statistics });
    } catch (error: any) {
      console.error('❌ pdf:get-statistics error:', error);
      return {
        ...errorResponse(error),
        statistics: { totalDocuments: 0, totalChunks: 0, totalEmbeddings: 0 },
      };
    }
  });

  console.log('✅ PDF handlers registered');
}
