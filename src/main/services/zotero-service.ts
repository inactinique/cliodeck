import path from 'path';
import { ZoteroAPI } from '../../../backend/integrations/zotero/ZoteroAPI.js';
import { ZoteroSync } from '../../../backend/integrations/zotero/ZoteroSync.js';

class ZoteroService {
  /**
   * Test connection to Zotero API
   */
  async testConnection(userId: string, apiKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      const api = new ZoteroAPI({ userId, apiKey });
      const isConnected = await api.testConnection();

      return { success: isConnected };
    } catch (error: any) {
      console.error('Zotero test connection failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * List all collections from Zotero with hierarchy
   */
  async listCollections(userId: string, apiKey: string): Promise<{
    success: boolean;
    collections?: Array<{ key: string; name: string; parentCollection?: string }>;
    error?: string;
  }> {
    try {
      const api = new ZoteroAPI({ userId, apiKey });
      const collections = await api.listCollections();

      // Build hierarchical structure
      const collectionMap = collections.map((c) => ({
        key: c.key,
        name: c.data.name,
        parentCollection: c.data.parentCollection,
      }));

      // Sort to show top-level collections first, then their children
      const sortedCollections = this.sortCollectionsHierarchically(collectionMap);

      return {
        success: true,
        collections: sortedCollections,
      };
    } catch (error: any) {
      console.error('Failed to list Zotero collections:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sort collections hierarchically (top-level first, then children indented)
   */
  private sortCollectionsHierarchically(
    collections: Array<{ key: string; name: string; parentCollection?: string }>
  ): Array<{ key: string; name: string; parentCollection?: string }> {
    const result: Array<{ key: string; name: string; parentCollection?: string }> = [];
    const topLevel = collections.filter((c) => !c.parentCollection);

    const addWithChildren = (parent: { key: string; name: string; parentCollection?: string }, depth: number = 0) => {
      result.push(parent);
      const children = collections.filter((c) => c.parentCollection === parent.key);
      children.forEach((child) => addWithChildren(child, depth + 1));
    };

    topLevel.forEach((col) => addWithChildren(col));
    return result;
  }

  /**
   * Sync Zotero collection to local project
   */
  async sync(options: {
    userId: string;
    apiKey: string;
    collectionKey?: string;
    downloadPDFs: boolean;
    exportBibTeX: boolean;
    targetDirectory?: string; // Optional: specify custom target directory
  }): Promise<{
    success: boolean;
    itemCount?: number;
    pdfCount?: number;
    bibtexPath?: string;
    error?: string;
  }> {
    try {
      const api = new ZoteroAPI({
        userId: options.userId,
        apiKey: options.apiKey,
      });

      const sync = new ZoteroSync(api);

      // Use provided target directory or default to zotero-sync
      const targetDirectory = options.targetDirectory || path.join(process.cwd(), 'zotero-sync');

      const result = await sync.syncCollection({
        collectionKey: options.collectionKey,
        downloadPDFs: options.downloadPDFs,
        exportBibTeX: options.exportBibTeX,
        targetDirectory,
      });

      return {
        success: true,
        itemCount: result.items.length,
        pdfCount: result.pdfPaths.length,
        bibtexPath: result.bibtexPath,
      };
    } catch (error: any) {
      console.error('Zotero sync failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export const zoteroService = new ZoteroService();
