/**
 * Zotero integration IPC handlers
 */
import { ipcMain } from 'electron';
import { zoteroService } from '../../services/zotero-service.js';
import { pdfService } from '../../services/pdf-service.js';
import { successResponse, errorResponse } from '../utils/error-handler.js';
import { validate, ZoteroTestConnectionSchema, ZoteroSyncSchema } from '../utils/validation.js';

export function setupZoteroHandlers() {
  ipcMain.handle('zotero:test-connection', async (_event, userId: string, apiKey: string, groupId?: string) => {
    console.log('📞 IPC Call: zotero:test-connection', { userId, groupId });
    try {
      const validatedData = validate(ZoteroTestConnectionSchema, { userId, apiKey, groupId });
      const result = await zoteroService.testConnection(
        validatedData.userId,
        validatedData.apiKey,
        validatedData.groupId
      );
      console.log('📤 IPC Response: zotero:test-connection', result);
      return result;
    } catch (error: any) {
      console.error('❌ zotero:test-connection error:', error);
      return errorResponse(error);
    }
  });

  ipcMain.handle('zotero:list-collections', async (_event, userId: string, apiKey: string, groupId?: string) => {
    console.log('📞 IPC Call: zotero:list-collections', { userId, groupId });
    try {
      const validatedData = validate(ZoteroTestConnectionSchema, { userId, apiKey, groupId });
      const result = await zoteroService.listCollections(
        validatedData.userId,
        validatedData.apiKey,
        validatedData.groupId
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

      // Save collections to VectorStore if sync was successful
      if (result.success && result.collections && result.collections.length > 0) {
        const vectorStore = pdfService.getVectorStore();
        if (vectorStore) {
          vectorStore.saveCollections(result.collections);
          console.log(`📁 Saved ${result.collections.length} collections to VectorStore`);
        }
      }

      console.log('📤 IPC Response: zotero:sync', {
        success: result.success,
        itemCount: result.itemCount,
        pdfCount: result.pdfCount,
        collectionCount: result.collections?.length,
      });
      return result;
    } catch (error: any) {
      console.error('❌ zotero:sync error:', error);
      return errorResponse(error);
    }
  });

  ipcMain.handle('zotero:download-pdf', async (_event, options: {
    userId: string;
    apiKey: string;
    groupId?: string;
    attachmentKey: string;
    filename: string;
    targetDirectory: string;
  }) => {
    console.log('📞 IPC Call: zotero:download-pdf', { attachmentKey: options.attachmentKey });
    try {
      const result = await zoteroService.downloadPDF(options);
      console.log('📤 IPC Response: zotero:download-pdf', {
        success: result.success,
        filePath: result.filePath,
      });
      return result;
    } catch (error: any) {
      console.error('❌ zotero:download-pdf error:', error);
      return errorResponse(error);
    }
  });

  ipcMain.handle('zotero:enrich-citations', async (_event, options: {
    userId: string;
    apiKey: string;
    groupId?: string;
    citations: any[];
    collectionKey?: string;
  }) => {
    console.log('📞 IPC Call: zotero:enrich-citations', {
      citationCount: options.citations?.length,
      collectionKey: options.collectionKey
    });
    try {
      const result = await zoteroService.enrichCitations(options);
      console.log('📤 IPC Response: zotero:enrich-citations', {
        success: result.success,
        enrichedCount: result.citations?.length,
      });
      return result;
    } catch (error: any) {
      console.error('❌ zotero:enrich-citations error:', error);
      return errorResponse(error);
    }
  });

  ipcMain.handle('zotero:check-updates', async (_event, options: {
    userId: string;
    apiKey: string;
    groupId?: string;
    localCitations: any[];
    collectionKey?: string;
  }) => {
    console.log('📞 IPC Call: zotero:check-updates', {
      citationCount: options.localCitations?.length,
      collectionKey: options.collectionKey
    });
    try {
      const result = await zoteroService.checkUpdates(options);
      console.log('📤 IPC Response: zotero:check-updates', {
        success: result.success,
        hasChanges: result.hasChanges,
        summary: result.summary,
      });
      return result;
    } catch (error: any) {
      console.error('❌ zotero:check-updates error:', error);
      return errorResponse(error);
    }
  });

  ipcMain.handle('zotero:apply-updates', async (_event, options: {
    userId: string;
    apiKey: string;
    groupId?: string;
    currentCitations: any[];
    diff: any;
    strategy: 'local' | 'remote' | 'manual';
    resolution?: any;
  }) => {
    console.log('📞 IPC Call: zotero:apply-updates', {
      strategy: options.strategy,
      citationCount: options.currentCitations?.length
    });
    try {
      const result = await zoteroService.applyUpdates(options);
      console.log('📤 IPC Response: zotero:apply-updates', {
        success: result.success,
        addedCount: result.addedCount,
        modifiedCount: result.modifiedCount,
        deletedCount: result.deletedCount,
      });
      return result;
    } catch (error: any) {
      console.error('❌ zotero:apply-updates error:', error);
      return errorResponse(error);
    }
  });

  console.log('✅ Zotero handlers registered');
}
