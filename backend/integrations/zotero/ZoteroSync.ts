import * as fs from 'fs';
import * as path from 'path';
import { ZoteroAPI, ZoteroItem, ZoteroCollection } from './ZoteroAPI';

export interface SyncResult {
  collections: ZoteroCollection[];
  items: ZoteroItem[];
  bibtexPath: string;
  pdfPaths: string[];
  errors: string[];
}

export interface SyncOptions {
  collectionKey?: string;
  downloadPDFs?: boolean;
  exportBibTeX?: boolean;
  targetDirectory: string;
}

export class ZoteroSync {
  private api: ZoteroAPI;

  constructor(api: ZoteroAPI) {
    this.api = api;
  }

  /**
   * Synchronise une collection Zotero vers le projet local
   */
  async syncCollection(options: SyncOptions): Promise<SyncResult> {
    const result: SyncResult = {
      collections: [],
      items: [],
      bibtexPath: '',
      pdfPaths: [],
      errors: [],
    };

    try {
      // 1. Créer le dossier de destination
      if (!fs.existsSync(options.targetDirectory)) {
        fs.mkdirSync(options.targetDirectory, { recursive: true });
      }

      // 2. Récupérer la collection (si spécifiée)
      if (options.collectionKey) {
        try {
          const collection = await this.api.getCollection(options.collectionKey);
          result.collections.push(collection);
          console.log(`📚 Collection: ${collection.data.name}`);
        } catch (error) {
          result.errors.push(`Failed to get collection: ${error}`);
        }
      }

      // 3. Récupérer les items
      try {
        const items = await this.api.listItems({
          collectionKey: options.collectionKey,
        });
        result.items = items;

        // Count item types for debugging
        const typeCounts: Record<string, number> = {};
        items.forEach(item => {
          const type = item.data.itemType;
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        // Count bibliographic items (non-attachments, non-notes)
        const bibliographicItems = items.filter(
          item => item.data.itemType !== 'attachment' && item.data.itemType !== 'note'
        );

        console.log(`📄 ${items.length} items trouvés (${bibliographicItems.length} bibliographiques)`);
        console.log('📊 Types d\'items:', typeCounts);
      } catch (error) {
        result.errors.push(`Failed to list items: ${error}`);
        return result;
      }

      // 4. Exporter en BibTeX
      if (options.exportBibTeX) {
        try {
          const bibtexPath = path.join(options.targetDirectory, 'bibliography.bib');
          const bibtexContent = options.collectionKey
            ? await this.api.exportCollectionAsBibTeX(options.collectionKey)
            : await this.api.exportAllAsBibTeX();

          fs.writeFileSync(bibtexPath, bibtexContent, 'utf-8');
          result.bibtexPath = bibtexPath;
          console.log(`✅ BibTeX exporté: ${bibtexPath}`);
        } catch (error) {
          result.errors.push(`Failed to export BibTeX: ${error}`);
        }
      }

      // 5. Télécharger les PDFs
      if (options.downloadPDFs) {
        const pdfDir = path.join(options.targetDirectory, 'pdfs');
        if (!fs.existsSync(pdfDir)) {
          fs.mkdirSync(pdfDir, { recursive: true });
        }

        for (const item of result.items) {
          try {
            // Récupérer les attachments
            const children = await this.api.getItemChildren(item.key);
            const pdfAttachments = children.filter(
              (child) =>
                child.data.itemType === 'attachment' &&
                (child.data as any).contentType === 'application/pdf'
            );

            for (const attachment of pdfAttachments) {
              try {
                const filename = this.sanitizeFilename(
                  (attachment.data as any).filename || `${item.data.title}.pdf`
                );
                const savePath = path.join(pdfDir, filename);

                await this.api.downloadFile(attachment.key, savePath);
                result.pdfPaths.push(savePath);
                console.log(`📥 PDF téléchargé: ${filename}`);
              } catch (error) {
                result.errors.push(`Failed to download PDF for ${item.data.title}: ${error}`);
              }
            }
          } catch (error) {
            result.errors.push(`Failed to get attachments for ${item.data.title}: ${error}`);
          }
        }
      }

      console.log(`\n✅ Sync terminé:`);
      console.log(`   - ${result.items.length} items`);
      console.log(`   - ${result.pdfPaths.length} PDFs`);
      console.log(`   - ${result.errors.length} erreurs`);

      return result;
    } catch (error) {
      result.errors.push(`Sync failed: ${error}`);
      return result;
    }
  }

  /**
   * Liste les collections disponibles
   */
  async listAvailableCollections(): Promise<ZoteroCollection[]> {
    try {
      return await this.api.listCollections();
    } catch (error) {
      console.error('Failed to list collections:', error);
      return [];
    }
  }

  /**
   * Obtient un résumé d'une collection
   */
  async getCollectionSummary(collectionKey: string): Promise<{
    name: string;
    itemCount: number;
    pdfCount: number;
  }> {
    try {
      const collection = await this.api.getCollection(collectionKey);
      const items = await this.api.listItems({ collectionKey });

      let pdfCount = 0;
      for (const item of items) {
        const children = await this.api.getItemChildren(item.key);
        const pdfs = children.filter(
          (child) =>
            child.data.itemType === 'attachment' &&
            (child.data as any).contentType === 'application/pdf'
        );
        pdfCount += pdfs.length;
      }

      return {
        name: collection.data.name,
        itemCount: items.length,
        pdfCount,
      };
    } catch (error) {
      console.error('Failed to get collection summary:', error);
      throw error;
    }
  }

  /**
   * Nettoie un nom de fichier pour le système de fichiers
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 200);
  }
}
