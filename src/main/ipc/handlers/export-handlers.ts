/**
 * PDF and Presentation Export IPC handlers
 */
import { ipcMain, BrowserWindow } from 'electron';
import { pdfExportService } from '../../services/pdf-export.js';
import { revealJsExportService } from '../../services/revealjs-export.js';
import { successResponse, errorResponse } from '../utils/error-handler.js';
import { validate, PDFExportSchema, RevealJSExportSchema } from '../utils/validation.js';

export function setupExportHandlers() {
  // PDF Export handlers
  ipcMain.handle('pdf-export:check-dependencies', async () => {
    console.log('📞 IPC Call: pdf-export:check-dependencies');
    try {
      const result = await pdfExportService.checkDependencies();
      console.log('📤 IPC Response: pdf-export:check-dependencies', result);
      return { ...successResponse(), ...result };
    } catch (error: any) {
      console.error('❌ pdf-export:check-dependencies error:', error);
      return errorResponse(error);
    }
  });

  ipcMain.handle('pdf-export:export', async (event, options: unknown) => {
    console.log('📞 IPC Call: pdf-export:export');
    try {
      const validatedData = validate(PDFExportSchema, options);
      console.log('  projectType:', validatedData.projectType, 'hasBibliography:', !!validatedData.bibliographyPath);

      const window = BrowserWindow.fromWebContents(event.sender);

      const result = await pdfExportService.exportToPDF(validatedData, (progress) => {
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
      return errorResponse(error);
    }
  });

  // Reveal.js Export handlers
  ipcMain.handle('revealjs-export:export', async (event, options: unknown) => {
    console.log('📞 IPC Call: revealjs-export:export');
    try {
      const validatedData = validate(RevealJSExportSchema, options);
      console.log('  hasConfig:', !!validatedData.config);

      const window = BrowserWindow.fromWebContents(event.sender);

      const result = await revealJsExportService.exportToRevealJs(validatedData as any, (progress) => {
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
      return errorResponse(error);
    }
  });

  console.log('✅ Export handlers registered');
}
