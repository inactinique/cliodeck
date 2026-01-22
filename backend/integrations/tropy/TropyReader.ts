import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';

// MARK: - Types Tropy

export interface TropyItem {
  id: number;
  template: string;
  title?: string;
  date?: string;
  creator?: string;
  type?: string;
  collection?: string;
  archive?: string;
  tags: string[];
  notes: TropyNote[];
  photos: TropyPhoto[];
}

export interface TropyPhoto {
  id: number;
  path: string;
  filename: string;
  title?: string;
  width?: number;
  height?: number;
  mimetype?: string;
  notes: TropyNote[];
  selections: TropySelection[];
}

export interface TropySelection {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  notes: TropyNote[];
}

export interface TropyNote {
  id: number;
  html: string;
  text: string;
}

export interface TropyProjectInfo {
  name: string;
  itemCount: number;
  lastModified: Date;
}

// Types pour les sources primaires (utilisés par TropySync)
export interface PrimarySourceItem {
  id: string;
  tropyId: number;
  title: string;
  date?: string;
  creator?: string;
  archive?: string;
  collection?: string;
  type?: string;
  tags: string[];
  photos: PrimarySourcePhoto[];
  transcription?: string;
  transcriptionSource?: 'tesseract' | 'transkribus' | 'manual' | 'tropy-notes';
  lastModified: Date;
  metadata: Record<string, string>;
}

export interface PrimarySourcePhoto {
  id: number;
  path: string;
  filename: string;
  width?: number;
  height?: number;
  mimetype?: string;
  hasTranscription: boolean;
  transcription?: string;
  notes: string[];
}

// MARK: - TropyReader

/**
 * Lecteur de projets Tropy (.tpy)
 * IMPORTANT: Ce lecteur ouvre les fichiers en mode LECTURE SEULE.
 * Il ne modifie JAMAIS le fichier .tpy.
 */
export class TropyReader {
  private db: Database.Database | null = null;
  private tpyPath: string | null = null;

  /**
   * Ouvre un projet Tropy (.tpy) en mode lecture seule
   * @param tpyPath Chemin vers le fichier .tpy
   * @throws Error si le fichier n'existe pas
   */
  openProject(tpyPath: string): void {
    if (!fs.existsSync(tpyPath)) {
      throw new Error(`Tropy project not found: ${tpyPath}`);
    }

    // IMPORTANT: Mode lecture seule - ne jamais modifier le fichier .tpy
    this.db = new Database(tpyPath, { readonly: true });
    this.tpyPath = tpyPath;
  }

  /**
   * Ferme le projet
   */
  closeProject(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.tpyPath = null;
    }
  }

  /**
   * Vérifie si un projet est ouvert
   */
  isOpen(): boolean {
    return this.db !== null;
  }

  /**
   * Retourne le chemin du projet ouvert
   */
  getProjectPath(): string | null {
    return this.tpyPath;
  }

  /**
   * Lit le nom du projet
   */
  getProjectName(): string {
    if (!this.db) throw new Error('No project opened');

    try {
      const result = this.db.prepare('SELECT name FROM project LIMIT 1').get() as {
        name: string;
      } | undefined;
      return result?.name || 'Unnamed Project';
    } catch {
      return 'Unnamed Project';
    }
  }

  /**
   * Retourne la date de dernière modification du fichier .tpy
   * Utilisé par le watcher pour détecter les changements
   */
  getLastModifiedTime(): Date {
    if (!this.tpyPath) throw new Error('No project opened');

    const stats = fs.statSync(this.tpyPath);
    return stats.mtime;
  }

  /**
   * Retourne les informations générales du projet
   */
  getProjectInfo(): TropyProjectInfo {
    if (!this.db || !this.tpyPath) throw new Error('No project opened');

    return {
      name: this.getProjectName(),
      itemCount: this.getItemCount(),
      lastModified: this.getLastModifiedTime(),
    };
  }

  /**
   * Retourne le nombre d'items dans le projet
   */
  getItemCount(): number {
    if (!this.db) throw new Error('No project opened');

    try {
      const result = this.db.prepare('SELECT COUNT(*) as count FROM items').get() as {
        count: number;
      };
      return result.count;
    } catch {
      return 0;
    }
  }

  /**
   * Liste tous les items du projet
   */
  listItems(): TropyItem[] {
    if (!this.db) throw new Error('No project opened');

    const items: TropyItem[] = [];

    try {
      const itemRows = this.db.prepare('SELECT * FROM items').all() as Array<{
        id: number;
        template: string;
      }>;

      for (const itemRow of itemRows) {
        const item: TropyItem = {
          id: itemRow.id,
          template: itemRow.template,
          tags: [],
          notes: [],
          photos: [],
        };

        // Récupérer les métadonnées (title, date, creator, etc.)
        const metadata = this.getItemMetadata(itemRow.id);
        Object.assign(item, metadata);

        // Récupérer les tags
        item.tags = this.getItemTags(itemRow.id);

        // Récupérer les notes
        item.notes = this.getItemNotes(itemRow.id);

        // Récupérer les photos
        item.photos = this.getItemPhotos(itemRow.id);

        items.push(item);
      }

      return items;
    } catch (error) {
      console.error('Failed to list items:', error);
      return [];
    }
  }

  /**
   * Récupère un item par son ID
   */
  getItem(itemId: number): TropyItem | null {
    if (!this.db) throw new Error('No project opened');

    try {
      const itemRow = this.db.prepare('SELECT * FROM items WHERE id = ?').get(itemId) as {
        id: number;
        template: string;
      } | undefined;

      if (!itemRow) return null;

      const item: TropyItem = {
        id: itemRow.id,
        template: itemRow.template,
        tags: [],
        notes: [],
        photos: [],
      };

      const metadata = this.getItemMetadata(itemRow.id);
      Object.assign(item, metadata);
      item.tags = this.getItemTags(itemRow.id);
      item.notes = this.getItemNotes(itemRow.id);
      item.photos = this.getItemPhotos(itemRow.id);

      return item;
    } catch (error) {
      console.error('Failed to get item:', error);
      return null;
    }
  }

  /**
   * Extrait tout le texte d'un item (notes de l'item + notes des photos)
   * Utile pour l'indexation sans OCR
   */
  extractItemText(item: TropyItem): string {
    const textParts: string[] = [];

    // Titre et métadonnées
    if (item.title) textParts.push(item.title);
    if (item.creator) textParts.push(`Créateur: ${item.creator}`);
    if (item.date) textParts.push(`Date: ${item.date}`);
    if (item.archive) textParts.push(`Archive: ${item.archive}`);
    if (item.collection) textParts.push(`Collection: ${item.collection}`);

    // Notes de l'item
    for (const note of item.notes) {
      if (note.text) textParts.push(note.text);
    }

    // Notes des photos et sélections
    for (const photo of item.photos) {
      for (const note of photo.notes) {
        if (note.text) textParts.push(note.text);
      }
      for (const selection of photo.selections) {
        for (const note of selection.notes) {
          if (note.text) textParts.push(note.text);
        }
      }
    }

    return textParts.join('\n\n');
  }

  /**
   * Liste toutes les photos du projet avec leurs chemins
   * Utile pour vérifier quelles photos existent et lesquelles nécessitent OCR
   */
  listAllPhotos(): Array<{ itemId: number; photo: TropyPhoto }> {
    if (!this.db) throw new Error('No project opened');

    const photos: Array<{ itemId: number; photo: TropyPhoto }> = [];

    try {
      const photoRows = this.db
        .prepare('SELECT id, item_id, path, width, height, mimetype FROM photos')
        .all() as Array<{
        id: number;
        item_id: number;
        path: string;
        width?: number;
        height?: number;
        mimetype?: string;
      }>;

      for (const row of photoRows) {
        const photo: TropyPhoto = {
          id: row.id,
          path: row.path,
          filename: path.basename(row.path),
          width: row.width,
          height: row.height,
          mimetype: row.mimetype,
          notes: this.getPhotoNotes(row.id),
          selections: this.getPhotoSelections(row.id),
        };

        photos.push({ itemId: row.item_id, photo });
      }

      return photos;
    } catch (error) {
      console.error('Failed to list photos:', error);
      return [];
    }
  }

  /**
   * Récupère tous les tags uniques du projet
   */
  getAllTags(): string[] {
    if (!this.db) throw new Error('No project opened');

    try {
      const tagRows = this.db.prepare('SELECT DISTINCT name FROM tags').all() as Array<{
        name: string;
      }>;
      return tagRows.map((row) => row.name);
    } catch {
      return [];
    }
  }

  // MARK: - Private Methods

  private getItemMetadata(itemId: number): Partial<TropyItem> {
    if (!this.db) return {};

    try {
      const metadataRows = this.db
        .prepare('SELECT property, value FROM metadata WHERE id = ?')
        .all(itemId) as Array<{ property: string; value: string }>;

      const metadata: Record<string, string> = {};

      for (const row of metadataRows) {
        const propertyName = this.extractPropertyName(row.property);
        if (propertyName) {
          metadata[propertyName] = row.value;
        }
      }

      return metadata as Partial<TropyItem>;
    } catch {
      return {};
    }
  }

  private extractPropertyName(propertyURI: string): string | null {
    // Extraire le nom de la propriété depuis l'URI
    // Ex: "http://purl.org/dc/elements/1.1/title" → "title"
    const match = propertyURI.match(/[/#]([^/#]+)$/);
    return match ? match[1] : null;
  }

  private getItemTags(itemId: number): string[] {
    if (!this.db) return [];

    try {
      const tagRows = this.db
        .prepare('SELECT name FROM tags WHERE id IN (SELECT tag_id FROM taggings WHERE id = ?)')
        .all(itemId) as Array<{ name: string }>;

      return tagRows.map((row) => row.name);
    } catch {
      return [];
    }
  }

  private getItemNotes(itemId: number): TropyNote[] {
    if (!this.db) return [];

    try {
      const noteRows = this.db
        .prepare('SELECT id, html, text FROM notes WHERE id = ?')
        .all(itemId) as Array<{ id: number; html: string; text: string }>;

      return noteRows.map((row) => ({
        id: row.id,
        html: row.html || '',
        text: row.text || '',
      }));
    } catch {
      return [];
    }
  }

  private getItemPhotos(itemId: number): TropyPhoto[] {
    if (!this.db) return [];

    try {
      const photoRows = this.db
        .prepare('SELECT id, path, width, height, mimetype FROM photos WHERE item_id = ?')
        .all(itemId) as Array<{
        id: number;
        path: string;
        width?: number;
        height?: number;
        mimetype?: string;
      }>;

      return photoRows.map((row) => {
        const photo: TropyPhoto = {
          id: row.id,
          path: row.path,
          filename: path.basename(row.path),
          width: row.width,
          height: row.height,
          mimetype: row.mimetype,
          notes: this.getPhotoNotes(row.id),
          selections: this.getPhotoSelections(row.id),
        };

        return photo;
      });
    } catch {
      return [];
    }
  }

  private getPhotoNotes(photoId: number): TropyNote[] {
    if (!this.db) return [];

    try {
      const noteRows = this.db
        .prepare('SELECT id, html, text FROM notes WHERE photo_id = ?')
        .all(photoId) as Array<{ id: number; html: string; text: string }>;

      return noteRows.map((row) => ({
        id: row.id,
        html: row.html || '',
        text: row.text || '',
      }));
    } catch {
      return [];
    }
  }

  private getPhotoSelections(photoId: number): TropySelection[] {
    if (!this.db) return [];

    try {
      const selectionRows = this.db
        .prepare('SELECT id, x, y, width, height, angle FROM selections WHERE photo_id = ?')
        .all(photoId) as Array<{
        id: number;
        x: number;
        y: number;
        width: number;
        height: number;
        angle: number;
      }>;

      return selectionRows.map((row) => ({
        id: row.id,
        x: row.x,
        y: row.y,
        width: row.width,
        height: row.height,
        angle: row.angle,
        notes: this.getSelectionNotes(row.id),
      }));
    } catch {
      return [];
    }
  }

  private getSelectionNotes(selectionId: number): TropyNote[] {
    if (!this.db) return [];

    try {
      const noteRows = this.db
        .prepare('SELECT id, html, text FROM notes WHERE selection_id = ?')
        .all(selectionId) as Array<{ id: number; html: string; text: string }>;

      return noteRows.map((row) => ({
        id: row.id,
        html: row.html || '',
        text: row.text || '',
      }));
    } catch {
      return [];
    }
  }
}
