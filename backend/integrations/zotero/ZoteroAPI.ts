// Zotero Web API v3 Client
// Documentation: https://www.zotero.org/support/dev/web_api/v3/start

export interface ZoteroConfig {
  userId: string;
  apiKey: string;
  baseURL?: string;
}

export interface ZoteroItem {
  key: string;
  version: number;
  library: {
    type: string;
    id: number;
    name: string;
  };
  data: {
    key: string;
    version: number;
    itemType: string;
    title?: string;
    creators?: Array<{
      creatorType: string;
      firstName?: string;
      lastName?: string;
      name?: string;
    }>;
    date?: string;
    publicationTitle?: string;
    publisher?: string;
    DOI?: string;
    ISBN?: string;
    url?: string;
    abstractNote?: string;
    tags?: Array<{ tag: string }>;
    collections?: string[];
    relations?: Record<string, unknown>;
    dateAdded?: string;
    dateModified?: string;
    attachments?: ZoteroAttachment[];
  };
}

export interface ZoteroAttachment {
  key: string;
  itemType: 'attachment';
  linkMode: string;
  contentType?: string;
  filename?: string;
  path?: string;
}

export interface ZoteroCollection {
  key: string;
  version: number;
  data: {
    key: string;
    version: number;
    name: string;
    parentCollection?: string;
  };
}

export class ZoteroAPI {
  private config: ZoteroConfig;
  private baseURL: string;

  constructor(config: ZoteroConfig) {
    this.config = config;
    this.baseURL = config.baseURL || 'https://api.zotero.org';
  }

  // MARK: - Collections

  /**
   * Liste toutes les collections de l'utilisateur (avec pagination)
   */
  async listCollections(): Promise<ZoteroCollection[]> {
    const allCollections: ZoteroCollection[] = [];
    const pageSize = 100; // Zotero max per request
    let start = 0;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams();
      params.append('limit', pageSize.toString());
      params.append('start', start.toString());

      const url = `${this.baseURL}/users/${this.config.userId}/collections?${params.toString()}`;

      const collections = (await this.makeRequest(url)) as ZoteroCollection[];
      allCollections.push(...collections);

      console.log(`📥 Fetched ${collections.length} collections (start: ${start}, total so far: ${allCollections.length})`);

      // Check if there are more collections
      if (collections.length < pageSize) {
        hasMore = false;
      } else {
        start += pageSize;
      }
    }

    return allCollections;
  }

  /**
   * Liste les sous-collections d'une collection
   */
  async listSubcollections(collectionKey: string): Promise<ZoteroCollection[]> {
    const allCollections = await this.listCollections();
    return allCollections.filter(c => c.data.parentCollection === collectionKey);
  }

  /**
   * Obtient une collection spécifique
   */
  async getCollection(collectionKey: string): Promise<ZoteroCollection> {
    const url = `${this.baseURL}/users/${this.config.userId}/collections/${collectionKey}`;
    const response = await this.makeRequest(url);
    return response as ZoteroCollection;
  }

  // MARK: - Items

  /**
   * Liste tous les items de l'utilisateur
   */
  async listItems(options?: {
    collectionKey?: string;
    limit?: number;
    start?: number;
    itemType?: string;
  }): Promise<ZoteroItem[]> {
    const allItems: ZoteroItem[] = [];
    const pageSize = 100; // Zotero max per request
    let start = options?.start || 0;
    let hasMore = true;

    while (hasMore) {
      let url = options?.collectionKey
        ? `${this.baseURL}/users/${this.config.userId}/collections/${options.collectionKey}/items`
        : `${this.baseURL}/users/${this.config.userId}/items`;

      const params = new URLSearchParams();
      params.append('limit', pageSize.toString());
      params.append('start', start.toString());
      if (options?.itemType) params.append('itemType', options.itemType);

      url += `?${params.toString()}`;

      const items = (await this.makeRequest(url)) as ZoteroItem[];
      allItems.push(...items);

      console.log(`📥 Fetched ${items.length} items (start: ${start}, total so far: ${allItems.length})`);

      // Check if there are more items
      if (items.length < pageSize) {
        hasMore = false;
      } else {
        start += pageSize;
      }

      // If user specified a limit, stop when reached
      if (options?.limit && allItems.length >= options.limit) {
        hasMore = false;
        return allItems.slice(0, options.limit);
      }
    }

    return allItems;
  }

  /**
   * Obtient un item spécifique
   */
  async getItem(itemKey: string): Promise<ZoteroItem> {
    const url = `${this.baseURL}/users/${this.config.userId}/items/${itemKey}`;
    const response = await this.makeRequest(url);
    return response as ZoteroItem;
  }

  /**
   * Liste les enfants d'un item (attachements, notes)
   */
  async getItemChildren(itemKey: string): Promise<ZoteroItem[]> {
    const url = `${this.baseURL}/users/${this.config.userId}/items/${itemKey}/children`;
    const response = await this.makeRequest(url);
    return response as ZoteroItem[];
  }

  // MARK: - Export

  /**
   * Exporte une collection en BibTeX (inclut récursivement les sous-collections)
   */
  async exportCollectionAsBibTeX(collectionKey: string, includeSubcollections: boolean = true): Promise<string> {
    const allBibTeX: string[] = [];
    let totalEntries = 0;

    // Export main collection
    const mainBibTeX = await this.exportSingleCollectionAsBibTeX(collectionKey);
    const mainEntryCount = (mainBibTeX.match(/@\w+\{/g) || []).length;
    if (mainBibTeX && mainBibTeX.trim().length > 0) {
      allBibTeX.push(mainBibTeX);
      totalEntries += mainEntryCount;
    }
    console.log(`📚 Collection principale: ${mainEntryCount} entrées`);

    // Export subcollections if requested
    if (includeSubcollections) {
      const subcollections = await this.listSubcollections(collectionKey);
      console.log(`🔍 ${subcollections.length} sous-collections trouvées`);

      for (const subcol of subcollections) {
        const subBibTeX = await this.exportCollectionAsBibTeX(subcol.key, true); // Recursive
        const subEntryCount = (subBibTeX.match(/@\w+\{/g) || []).length;
        if (subBibTeX && subBibTeX.trim().length > 0 && subEntryCount > 0) {
          allBibTeX.push(subBibTeX);
          totalEntries += subEntryCount;
        }
        console.log(`  📁 Sous-collection "${subcol.data.name}": ${subEntryCount} entrées`);
      }
    }

    console.log(`📚 Total BibTeX entries fetched: ${totalEntries}`);
    return allBibTeX.join('\n\n');
  }

  /**
   * Exporte une seule collection (sans sous-collections)
   */
  private async exportSingleCollectionAsBibTeX(collectionKey: string): Promise<string> {
    const allBibTeX: string[] = [];
    const pageSize = 100; // Zotero max per request
    let start = 0;
    let hasMore = true;

    while (hasMore) {
      const params = new URLSearchParams();
      params.append('format', 'bibtex');
      params.append('limit', pageSize.toString());
      params.append('start', start.toString());

      const url = `${this.baseURL}/users/${this.config.userId}/collections/${collectionKey}/items?${params.toString()}`;

      const response = await this.makeRequest(url, { headers: { Accept: 'text/plain' } });
      const bibtex = response as string;

      // Count entries in this chunk
      const entryCount = (bibtex.match(/@\w+\{/g) || []).length;

      // Only add if we got content
      if (bibtex && bibtex.trim().length > 0 && entryCount > 0) {
        allBibTeX.push(bibtex);
      }

      // Stop if we got no entries (empty response)
      if (entryCount === 0) {
        hasMore = false;
      } else {
        // Continue to next page
        start += pageSize;
      }
    }

    return allBibTeX.join('\n\n');
  }

  /**
   * Exporte tous les items en BibTeX
   */
  async exportAllAsBibTeX(): Promise<string> {
    const allBibTeX: string[] = [];
    const pageSize = 100; // Zotero max per request
    let start = 0;
    let hasMore = true;
    let totalEntries = 0;

    while (hasMore) {
      const params = new URLSearchParams();
      params.append('format', 'bibtex');
      params.append('limit', pageSize.toString());
      params.append('start', start.toString());

      const url = `${this.baseURL}/users/${this.config.userId}/items?${params.toString()}`;

      const response = await this.makeRequest(url, { headers: { Accept: 'text/plain' } });
      const bibtex = response as string;

      // Count entries in this chunk
      const entryCount = (bibtex.match(/@\w+\{/g) || []).length;

      console.log(`📥 Fetched BibTeX chunk (start: ${start}, entries: ${entryCount})`);

      // Only add if we got content
      if (bibtex && bibtex.trim().length > 0 && entryCount > 0) {
        allBibTeX.push(bibtex);
        totalEntries += entryCount;
      }

      // Stop if we got no entries (empty response)
      if (entryCount === 0) {
        hasMore = false;
      } else {
        // Continue to next page
        start += pageSize;
      }
    }

    console.log(`📚 Total BibTeX entries fetched: ${totalEntries}`);
    return allBibTeX.join('\n\n');
  }

  // MARK: - Files

  /**
   * Télécharge un fichier attaché (PDF)
   */
  async downloadFile(itemKey: string, savePath: string): Promise<void> {
    const url = `${this.baseURL}/users/${this.config.userId}/items/${itemKey}/file`;

    const response = await fetch(url, {
      headers: {
        'Zotero-API-Key': this.config.apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Zotero API error: ${response.status} ${response.statusText}`);
    }

    const fs = await import('fs');
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(savePath, Buffer.from(buffer));
  }

  // MARK: - Request Helper

  private async makeRequest(
    url: string,
    options?: { headers?: Record<string, string> }
  ): Promise<unknown> {
    const headers: Record<string, string> = {
      'Zotero-API-Key': this.config.apiKey,
      'Zotero-API-Version': '3',
      ...options?.headers,
    };

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Zotero API error: ${response.status} ${response.statusText}\n${errorText}`
      );
    }

    // Si on demande du texte brut (BibTeX)
    if (headers.Accept === 'text/plain') {
      return await response.text();
    }

    // Sinon, JSON
    return await response.json();
  }

  // MARK: - Helpers

  /**
   * Teste la connexion à l'API Zotero
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.listCollections();
      return true;
    } catch (error) {
      console.error('Zotero connection failed:', error);
      return false;
    }
  }

  /**
   * Obtient les métadonnées de base d'un item
   */
  getItemMetadata(item: ZoteroItem): {
    title: string;
    authors: string;
    year: string;
    type: string;
  } {
    const data = item.data;

    // Titre
    const title = data.title || 'Sans titre';

    // Auteurs
    const authors = data.creators
      ?.filter((c) => c.creatorType === 'author')
      .map((c) => {
        if (c.lastName && c.firstName) {
          return `${c.lastName}, ${c.firstName}`;
        }
        return c.name || c.lastName || '';
      })
      .join('; ');

    // Année
    const year = data.date ? this.extractYear(data.date) : '';

    return {
      title,
      authors: authors || '',
      year,
      type: data.itemType,
    };
  }

  private extractYear(dateString: string): string {
    const match = dateString.match(/\d{4}/);
    return match ? match[0] : '';
  }
}
