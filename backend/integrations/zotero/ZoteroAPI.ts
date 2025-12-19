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
   * Liste toutes les collections de l'utilisateur
   */
  async listCollections(): Promise<ZoteroCollection[]> {
    const url = `${this.baseURL}/users/${this.config.userId}/collections`;
    const response = await this.makeRequest(url);
    return response as ZoteroCollection[];
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
    let url = options?.collectionKey
      ? `${this.baseURL}/users/${this.config.userId}/collections/${options.collectionKey}/items`
      : `${this.baseURL}/users/${this.config.userId}/items`;

    const params = new URLSearchParams();
    if (options?.limit) params.append('limit', options.limit.toString());
    if (options?.start) params.append('start', options.start.toString());
    if (options?.itemType) params.append('itemType', options.itemType);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await this.makeRequest(url);
    return response as ZoteroItem[];
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
   * Exporte une collection en BibTeX
   */
  async exportCollectionAsBibTeX(collectionKey: string): Promise<string> {
    const url = `${this.baseURL}/users/${this.config.userId}/collections/${collectionKey}/items?format=bibtex`;
    const response = await this.makeRequest(url, { headers: { Accept: 'text/plain' } });
    return response as string;
  }

  /**
   * Exporte tous les items en BibTeX
   */
  async exportAllAsBibTeX(): Promise<string> {
    const url = `${this.baseURL}/users/${this.config.userId}/items?format=bibtex`;
    const response = await this.makeRequest(url, { headers: { Accept: 'text/plain' } });
    return response as string;
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
