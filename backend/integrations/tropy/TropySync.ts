import { randomUUID } from 'crypto';
import {
  TropyReader,
  TropyItem,
  PrimarySourceItem,
  PrimarySourcePhoto,
} from './TropyReader';
import { TropyOCRPipeline, OCRResult, TranscriptionFormat } from './TropyOCRPipeline';
import {
  PrimarySourcesVectorStore,
  PrimarySourceDocument,
} from '../../core/vector-store/PrimarySourcesVectorStore';
import * as fs from 'fs';
import * as path from 'path';

// MARK: - Types

export interface TropySyncOptions {
  performOCR: boolean;
  ocrLanguage: string;
  transcriptionDirectory?: string;
  forceReindex?: boolean;
}

export interface TropySyncResult {
  success: boolean;
  projectName: string;
  totalItems: number;
  newItems: number;
  updatedItems: number;
  skippedItems: number;
  ocrPerformed: number;
  transcriptionsImported: number;
  errors: string[];
}

export interface TropySyncProgress {
  phase: 'reading' | 'processing' | 'indexing' | 'done';
  current: number;
  total: number;
  currentItem?: string;
}

export type TropySyncProgressCallback = (progress: TropySyncProgress) => void;

// MARK: - TropySync

/**
 * Synchronisation entre Tropy et ClioDeck
 * Lit les données du fichier .tpy (sans le modifier) et les indexe
 */
export class TropySync {
  private reader: TropyReader;
  private ocrPipeline: TropyOCRPipeline;

  constructor() {
    this.reader = new TropyReader();
    this.ocrPipeline = new TropyOCRPipeline();
  }

  /**
   * Synchronise un projet Tropy vers le VectorStore
   */
  async sync(
    tpyPath: string,
    vectorStore: PrimarySourcesVectorStore,
    options: TropySyncOptions,
    onProgress?: TropySyncProgressCallback
  ): Promise<TropySyncResult> {
    const result: TropySyncResult = {
      success: false,
      projectName: '',
      totalItems: 0,
      newItems: 0,
      updatedItems: 0,
      skippedItems: 0,
      ocrPerformed: 0,
      transcriptionsImported: 0,
      errors: [],
    };

    try {
      // Phase 1: Lecture du projet Tropy
      onProgress?.({ phase: 'reading', current: 0, total: 1 });

      this.reader.openProject(tpyPath);
      result.projectName = this.reader.getProjectName();
      const items = this.reader.listItems();
      result.totalItems = items.length;

      console.log(`📚 Syncing Tropy project: ${result.projectName} (${items.length} items)`);

      // Enregistrer le projet Tropy dans le VectorStore
      vectorStore.saveTropyProject(tpyPath, result.projectName, false);

      // Phase 2: Traitement des items
      onProgress?.({ phase: 'processing', current: 0, total: items.length });

      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        onProgress?.({
          phase: 'processing',
          current: i + 1,
          total: items.length,
          currentItem: item.title || `Item ${item.id}`,
        });

        try {
          const processResult = await this.processItem(item, vectorStore, options);

          if (processResult.isNew) {
            result.newItems++;
          } else if (processResult.isUpdated) {
            result.updatedItems++;
          } else {
            result.skippedItems++;
          }

          result.ocrPerformed += processResult.ocrCount;
          result.transcriptionsImported += processResult.transcriptionCount;
        } catch (error) {
          result.errors.push(`Item ${item.id} (${item.title}): ${error}`);
        }
      }

      // Phase 3: Mise à jour de la dernière sync
      onProgress?.({ phase: 'indexing', current: 1, total: 1 });
      vectorStore.updateLastSync(tpyPath);

      onProgress?.({ phase: 'done', current: items.length, total: items.length });

      result.success = true;
      console.log(`✅ Sync completed: ${result.newItems} new, ${result.updatedItems} updated`);
    } catch (error) {
      result.errors.push(`Sync failed: ${error}`);
      console.error('Sync error:', error);
    } finally {
      this.reader.closeProject();
    }

    return result;
  }

  /**
   * Traite un item Tropy individuel
   */
  private async processItem(
    item: TropyItem,
    vectorStore: PrimarySourcesVectorStore,
    options: TropySyncOptions
  ): Promise<{
    isNew: boolean;
    isUpdated: boolean;
    ocrCount: number;
    transcriptionCount: number;
  }> {
    const existingSource = vectorStore.getSourceByTropyId(item.id);
    let transcription = '';
    let transcriptionSource: PrimarySourceItem['transcriptionSource'] = undefined;
    let ocrCount = 0;
    let transcriptionCount = 0;

    // 1. D'abord, extraire le texte des notes Tropy (transcriptions manuelles dans Tropy)
    const notesText = this.reader.extractItemText(item);
    if (notesText.trim()) {
      transcription = notesText;
      transcriptionSource = 'tropy-notes';
    }

    // 2. Chercher des transcriptions externes (Transkribus, etc.)
    if (options.transcriptionDirectory && (!transcription || options.forceReindex)) {
      const externalTranscription = await this.findExternalTranscription(
        item,
        options.transcriptionDirectory
      );
      if (externalTranscription) {
        transcription = externalTranscription.text;
        transcriptionSource = 'transkribus';
        transcriptionCount++;
      }
    }

    // 3. Si pas de transcription et OCR activé, faire l'OCR
    if (!transcription && options.performOCR) {
      const ocrResult = await this.performOCROnItem(item, options.ocrLanguage);
      if (ocrResult) {
        transcription = ocrResult.text;
        transcriptionSource = 'tesseract';
        ocrCount = ocrResult.photoCount;
      }
    }

    // Construire la source primaire
    const sourceItem: PrimarySourceItem = {
      id: existingSource?.id || randomUUID(),
      tropyId: item.id,
      title: item.title || `Source ${item.id}`,
      date: item.date,
      creator: item.creator,
      archive: item.archive,
      collection: item.collection,
      type: item.type,
      tags: item.tags,
      photos: this.convertPhotos(item),
      transcription: transcription || undefined,
      transcriptionSource,
      lastModified: this.reader.getLastModifiedTime(),
      metadata: this.extractMetadata(item),
    };

    // Sauvegarder
    const isNew = !existingSource;
    const isUpdated =
      existingSource &&
      (options.forceReindex ||
        existingSource.lastModified !== sourceItem.lastModified.toISOString());

    if (isNew || isUpdated) {
      vectorStore.saveSource(sourceItem);
    }

    return { isNew, isUpdated: !isNew && isUpdated, ocrCount, transcriptionCount };
  }

  /**
   * Cherche une transcription externe pour un item
   */
  private async findExternalTranscription(
    item: TropyItem,
    transcriptionDirectory: string
  ): Promise<{ text: string; format: TranscriptionFormat } | null> {
    // Chercher des fichiers correspondants dans le dossier de transcriptions
    // Pattern: item_id.*, title.*, ou premier filename.*
    const possibleNames = [
      `${item.id}`,
      item.title?.replace(/[^a-zA-Z0-9]/g, '_'),
      item.photos[0]?.filename.replace(/\.[^.]+$/, ''),
    ].filter(Boolean);

    const extensions = ['.xml', '.txt'];

    for (const baseName of possibleNames) {
      for (const ext of extensions) {
        const filePath = path.join(transcriptionDirectory, `${baseName}${ext}`);

        if (fs.existsSync(filePath)) {
          const format = this.ocrPipeline.detectFormat(filePath);
          if (format) {
            try {
              const result = await this.ocrPipeline.importTranscription({
                type: format,
                filePath,
              });
              return { text: result.text, format };
            } catch (error) {
              console.warn(`Failed to import transcription ${filePath}:`, error);
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Effectue l'OCR sur toutes les photos d'un item
   */
  private async performOCROnItem(
    item: TropyItem,
    language: string
  ): Promise<{ text: string; photoCount: number } | null> {
    const photoPaths = item.photos
      .map((p) => p.path)
      .filter((p) => fs.existsSync(p));

    if (photoPaths.length === 0) {
      return null;
    }

    try {
      const result = await this.ocrPipeline.performBatchOCR(photoPaths, { language });

      // Ne retourner que si on a un texte significatif
      if (result.text.trim().length > 50 && result.confidence > 30) {
        return {
          text: result.text,
          photoCount: photoPaths.length,
        };
      }
    } catch (error) {
      console.warn(`OCR failed for item ${item.id}:`, error);
    }

    return null;
  }

  /**
   * Convertit les photos Tropy en format PrimarySourcePhoto
   */
  private convertPhotos(item: TropyItem): PrimarySourcePhoto[] {
    return item.photos.map((photo) => ({
      id: photo.id,
      path: photo.path,
      filename: photo.filename,
      width: photo.width,
      height: photo.height,
      mimetype: photo.mimetype,
      hasTranscription: photo.notes.length > 0,
      transcription: photo.notes.map((n) => n.text).join('\n\n') || undefined,
      notes: photo.notes.map((n) => n.text),
    }));
  }

  /**
   * Extrait les métadonnées supplémentaires d'un item
   */
  private extractMetadata(item: TropyItem): Record<string, string> {
    const metadata: Record<string, string> = {};

    if (item.template) metadata.template = item.template;
    if (item.type) metadata.type = item.type;

    // Ajouter d'autres métadonnées si présentes
    const knownFields = ['title', 'date', 'creator', 'archive', 'collection', 'type', 'tags'];
    for (const [key, value] of Object.entries(item)) {
      if (!knownFields.includes(key) && typeof value === 'string' && value) {
        metadata[key] = value;
      }
    }

    return metadata;
  }

  /**
   * Vérifie si une synchronisation est nécessaire
   * Compare la date de modification du fichier .tpy avec la dernière sync
   */
  checkSyncNeeded(tpyPath: string, vectorStore: PrimarySourcesVectorStore): boolean {
    const project = vectorStore.getTropyProject();
    if (!project) return true;

    if (project.tpyPath !== tpyPath) return true;

    try {
      const stats = fs.statSync(tpyPath);
      const lastSync = new Date(project.lastSync);
      return stats.mtime > lastSync;
    } catch {
      return true;
    }
  }

  /**
   * Libère les ressources
   */
  async dispose(): Promise<void> {
    this.reader.closeProject();
    await this.ocrPipeline.dispose();
  }
}

// MARK: - Factory

export function createTropySync(): TropySync {
  return new TropySync();
}
