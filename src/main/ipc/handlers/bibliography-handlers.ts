/**
 * Bibliography IPC handlers
 */
import { ipcMain } from 'electron';
import { bibliographyService } from '../../services/bibliography-service.js';
import { successResponse, errorResponse } from '../utils/error-handler.js';

export function setupBibliographyHandlers() {
  ipcMain.handle('bibliography:load', async (_event, filePath: string) => {
    try {
      const citations = await bibliographyService.loadFromFile(filePath);
      return successResponse({ citations });
    } catch (error: any) {
      console.error('❌ bibliography:load error:', error);
      return { ...errorResponse(error), citations: [] };
    }
  });

  ipcMain.handle('bibliography:parse', async (_event, content: string) => {
    try {
      const citations = await bibliographyService.parseContent(content);
      return successResponse({ citations });
    } catch (error: any) {
      console.error('❌ bibliography:parse error:', error);
      return { ...errorResponse(error), citations: [] };
    }
  });

  ipcMain.handle('bibliography:search', async (_event, query: string) => {
    try {
      const citations = bibliographyService.searchCitations(query);
      return successResponse({ citations });
    } catch (error: any) {
      console.error('❌ bibliography:search error:', error);
      return { ...errorResponse(error), citations: [] };
    }
  });

  console.log('✅ Bibliography handlers registered');
}
