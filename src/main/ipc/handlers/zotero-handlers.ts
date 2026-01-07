/**
 * Zotero integration IPC handlers
 */
import { ipcMain } from 'electron';
import { zoteroService } from '../../services/zotero-service.js';
import { successResponse, errorResponse } from '../utils/error-handler.js';
import { validate, ZoteroTestConnectionSchema, ZoteroSyncSchema } from '../utils/validation.js';

export function setupZoteroHandlers() {
  ipcMain.handle('zotero:test-connection', async (_event, userId: string, apiKey: string) => {
    console.log('📞 IPC Call: zotero:test-connection', { userId });
    try {
      const validatedData = validate(ZoteroTestConnectionSchema, { userId, apiKey });
      const result = await zoteroService.testConnection(
        validatedData.userId,
        validatedData.apiKey
      );
      console.log('📤 IPC Response: zotero:test-connection', result);
      return result;
    } catch (error: any) {
      console.error('❌ zotero:test-connection error:', error);
      return errorResponse(error);
    }
  });

  ipcMain.handle('zotero:list-collections', async (_event, userId: string, apiKey: string) => {
    console.log('📞 IPC Call: zotero:list-collections', { userId });
    try {
      const validatedData = validate(ZoteroTestConnectionSchema, { userId, apiKey });
      const result = await zoteroService.listCollections(
        validatedData.userId,
        validatedData.apiKey
      );
      console.log('📤 IPC Response: zotero:list-collections', {
        success: result.success,
        collectionCount: result.collections?.length,
      });
      return result;
    } catch (error: any) {
      console.error('❌ zotero:list-collections error:', error);
      return errorResponse(error);
    }
  });

  ipcMain.handle('zotero:sync', async (_event, options: unknown) => {
    console.log('📞 IPC Call: zotero:sync');
    try {
      const validatedData = validate(ZoteroSyncSchema, options);
      console.log('  userId:', validatedData.userId, 'collectionKey:', validatedData.collectionKey);
      const result = await zoteroService.sync(validatedData);
      console.log('📤 IPC Response: zotero:sync', {
        success: result.success,
        itemCount: result.itemCount,
        pdfCount: result.pdfCount,
      });
      return result;
    } catch (error: any) {
      console.error('❌ zotero:sync error:', error);
      return errorResponse(error);
    }
  });

  console.log('✅ Zotero handlers registered');
}
