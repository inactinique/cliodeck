import path from 'path';
import { ZoteroAPI, ZoteroItem } from '../../../backend/integrations/zotero/ZoteroAPI.js';
import { ZoteroSync } from '../../../backend/integrations/zotero/ZoteroSync.js';
import { Citation } from '../../../backend/types/citation.js';
import { SyncDiff } from '../../../backend/integrations/zotero/ZoteroDiffEngine.js';
import { ConflictStrategy, SyncResolution } from '../../../backend/integrations/zotero/ZoteroSyncResolver.js';

/**
 * Generate a bibtexKey from a Zotero item (Author_Year format)
 * This matches the logic in ZoteroDiffEngine.zoteroItemToCitation
 */
function generateBibtexKeyFromZoteroItem(item: ZoteroItem): string {
  const data = item.data;

  // Extract first author's last name
  const firstCreator = data.creators?.find((c) => c.creatorType === 'author');
  let authorName = 'Unknown';
  if (firstCreator) {
    if (firstCreator.lastName) {
      authorName = firstCreator.lastName;
    } else if (firstCreator.name) {
      // For single-field names, take the last word as surname
      const parts = firstCreator.name.split(' ');
      authorName = parts[parts.length - 1];
    }
  }

  // Extract year from date
  let year = '';
  if (data.date) {
    const yearMatch = data.date.match(/\d{4}/);
    year = yearMatch ? yearMatch[0] : '';
  }

  // Generate BibTeX key (Author_Year format)
  const bibtexKey = `${authorName.replace(/\s+/g, '')}_${year}`;
  return bibtexKey;
}

class ZoteroService {
  /**
   * Test connection to Zotero API
   */
  async testConnection(userId: string, apiKey: string, groupId?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const api = new ZoteroAPI({ userId, apiKey, groupId });
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
  async listCollections(userId: string, apiKey: string, groupId?: string): Promise<{
    success: boolean;
    collections?: Array<{ key: string; name: string; parentCollection?: string }>;
    error?: string;
  }> {
    try {
      const api = new ZoteroAPI({ userId, apiKey, groupId });
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
    groupId?: string;
    collectionKey?: string;
    downloadPDFs: boolean;
    exportBibTeX: boolean;
    targetDirectory?: string; // Optional: specify custom target directory
  }): Promise<{
    success: boolean;
    itemCount?: number;
    pdfCount?: number;
    bibtexPath?: string;
    collections?: Array<{ key: string; name: string; parentKey?: string }>;
    itemCollectionMap?: Record<string, string[]>;
    bibtexKeyToCollections?: Record<string, string[]>;
    error?: string;
  }> {
    try {
      const api = new ZoteroAPI({
        userId: options.userId,
        apiKey: options.apiKey,
        groupId: options.groupId,
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

      // Fetch all collections for the library/group
      const allCollections = await api.listCollections();
      const collectionsData = allCollections.map((c) => ({
        key: c.key,
        name: c.data.name,
        parentKey: c.data.parentCollection,
      }));

      // Build item -> collections mapping from synced items
      // Also build bibtexKey -> collections mapping for linking documents
      const itemCollectionMap: Record<string, string[]> = {};
      const bibtexKeyToCollections: Record<string, string[]> = {};

      // Filter to only bibliographic items (not attachments or notes)
      const bibliographicItems = result.items.filter(
        (item) => item.data.itemType !== 'attachment' && item.data.itemType !== 'note'
      );

      for (const item of bibliographicItems) {
        if (item.data.collections && item.data.collections.length > 0) {
          // Use zoteroKey (item.key) as the key for itemCollectionMap
          itemCollectionMap[item.key] = item.data.collections;

          // Generate bibtexKey and map to collections
          const bibtexKey = generateBibtexKeyFromZoteroItem(item);
          bibtexKeyToCollections[bibtexKey] = item.data.collections;
        }
      }

      console.log(`📁 ${collectionsData.length} collections récupérées`);
      console.log(`📎 ${Object.keys(itemCollectionMap).length} items avec collections (zoteroKey)`);
      console.log(`📎 ${Object.keys(bibtexKeyToCollections).length} items avec collections (bibtexKey)`);

      return {
        success: true,
        itemCount: result.items.length,
        pdfCount: result.pdfPaths.length,
        bibtexPath: result.bibtexPath,
        collections: collectionsData,
        itemCollectionMap,
        bibtexKeyToCollections,
      };
    } catch (error: any) {
      console.error('Zotero sync failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Download a specific PDF attachment from Zotero
   */
  async downloadPDF(options: {
    userId: string;
    apiKey: string;
    groupId?: string;
    attachmentKey: string;
    filename: string;
    targetDirectory: string;
  }): Promise<{
    success: boolean;
    filePath?: string;
    error?: string;
  }> {
    try {
      const api = new ZoteroAPI({
        userId: options.userId,
        apiKey: options.apiKey,
        groupId: options.groupId,
      });

      const sync = new ZoteroSync(api);

      // Create PDFs directory if it doesn't exist
      const pdfDir = path.join(options.targetDirectory, 'PDFs');

      // Sanitize filename
      const sanitizedFilename = options.filename
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/_+/g, '_')
        .substring(0, 200);

      const savePath = path.join(pdfDir, sanitizedFilename);

      // Download the file
      await api.downloadFile(options.attachmentKey, savePath);

      console.log(`✅ PDF downloaded: ${sanitizedFilename}`);

      return {
        success: true,
        filePath: savePath,
      };
    } catch (error: any) {
      console.error('Zotero PDF download failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enrich citations with Zotero attachment information
   */
  async enrichCitations(options: {
    userId: string;
    apiKey: string;
    groupId?: string;
    citations: Citation[];
    collectionKey?: string;
  }): Promise<{
    success: boolean;
    citations?: Citation[];
    error?: string;
  }> {
    try {
      const api = new ZoteroAPI({
        userId: options.userId,
        apiKey: options.apiKey,
        groupId: options.groupId,
      });

      const sync = new ZoteroSync(api);

      // Get Zotero items from collection
      const items = await api.listItems({
        collectionKey: options.collectionKey,
      });

      // Filter to bibliographic items only
      const bibliographicItems = items.filter(
        (item) => item.data.itemType !== 'attachment' && item.data.itemType !== 'note'
      );

      // Enrich citations with attachment info
      const enrichedCitations = await sync.enrichCitationsWithAttachments(
        options.citations,
        bibliographicItems
      );

      console.log(`✅ Enriched ${enrichedCitations.length} citations with Zotero attachments`);

      return {
        success: true,
        citations: enrichedCitations,
      };
    } catch (error: any) {
      console.error('Zotero enrich citations failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check for updates from Zotero collection
   */
  async checkUpdates(options: {
    userId: string;
    apiKey: string;
    groupId?: string;
    localCitations: Citation[];
    collectionKey?: string;
  }): Promise<{
    success: boolean;
    diff?: SyncDiff;
    hasChanges?: boolean;
    summary?: {
      totalChanges: number;
      addedCount: number;
      modifiedCount: number;
      deletedCount: number;
      unchangedCount: number;
    };
    error?: string;
  }> {
    try {
      const api = new ZoteroAPI({
        userId: options.userId,
        apiKey: options.apiKey,
        groupId: options.groupId,
      });

      const sync = new ZoteroSync(api);

      // Check for updates
      const diff = await sync.checkForUpdates(options.localCitations, options.collectionKey);

      // Get summary
      const diffEngine = new (await import('../../../backend/integrations/zotero/ZoteroDiffEngine.js')).ZoteroDiffEngine();
      const summary = diffEngine.getSummary(diff);
      const hasChanges = diffEngine.hasChanges(diff);

      return {
        success: true,
        diff,
        hasChanges,
        summary,
      };
    } catch (error: any) {
      console.error('Zotero check updates failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Apply updates from Zotero
   */
  async applyUpdates(options: {
    userId: string;
    apiKey: string;
    groupId?: string;
    currentCitations: Citation[];
    diff: SyncDiff;
    strategy: ConflictStrategy;
    resolution?: SyncResolution;
  }): Promise<{
    success: boolean;
    finalCitations?: Citation[];
    addedCount?: number;
    modifiedCount?: number;
    deletedCount?: number;
    skippedCount?: number;
    error?: string;
  }> {
    try {
      const api = new ZoteroAPI({
        userId: options.userId,
        apiKey: options.apiKey,
        groupId: options.groupId,
      });

      const sync = new ZoteroSync(api);

      // Apply updates
      const result = await sync.applyUpdates(
        options.currentCitations,
        options.diff,
        options.strategy,
        options.resolution
      );

      return {
        success: true,
        finalCitations: result.finalCitations,
        addedCount: result.addedCount,
        modifiedCount: result.modifiedCount,
        deletedCount: result.deletedCount,
        skippedCount: result.skippedCount,
      };
    } catch (error: any) {
      console.error('Zotero apply updates failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export const zoteroService = new ZoteroService();
