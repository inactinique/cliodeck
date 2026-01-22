import Database from 'better-sqlite3';
import path from 'path';
import { existsSync, mkdirSync, chmodSync } from 'fs';
import { randomUUID } from 'crypto';
import type { PrimarySourceItem, PrimarySourcePhoto } from '../../integrations/tropy/TropyReader';

// MARK: - Types

export interface PrimarySourceDocument {
  id: string;
  tropyId: number;
  title: string;
  date?: string;
  creator?: string;
  archive?: string;
  collection?: string;
  type?: string;
  transcription?: string;
  transcriptionSource?: 'tesseract' | 'transkribus' | 'manual' | 'tropy-notes';
  language?: string;
  lastModified: string;
  indexedAt: string;
  metadata?: Record<string, string>;
}

export interface PrimarySourceChunk {
  id: string;
  sourceId: string;
  content: string;
  chunkIndex: number;
  startPosition: number;
  endPosition: number;
}

export interface PrimarySourceSearchResult {
  chunk: PrimarySourceChunk;
  source: PrimarySourceDocument;
  similarity: number;
  sourceType: 'primary';
}

export interface PrimarySourcesStatistics {
  sourceCount: number;
  chunkCount: number;
  photoCount: number;
  withTranscription: number;
  withoutTranscription: number;
  byArchive: Record<string, number>;
  byCollection: Record<string, number>;
  tags: string[];
}

// MARK: - PrimarySourcesVectorStore

/**
 * VectorStore dédié aux sources primaires (Tropy)
 * Base de données séparée de celle des PDFs (sources secondaires)
 */
export class PrimarySourcesVectorStore {
  private db: Database.Database;
  private dbPath: string;
  public readonly projectPath: string;

  constructor(projectPath: string) {
    if (!projectPath) {
      throw new Error('PrimarySourcesVectorStore requires a project path.');
    }

    this.projectPath = projectPath;
    // Base de données séparée: project/.cliodeck/primary-sources.db
    this.dbPath = path.join(projectPath, '.cliodeck', 'primary-sources.db');

    console.log(`📁 Primary sources database: ${this.dbPath}`);

    // Créer le dossier .cliodeck si nécessaire
    const cliodeckDir = path.join(projectPath, '.cliodeck');
    if (!existsSync(cliodeckDir)) {
      mkdirSync(cliodeckDir, { recursive: true });
    }

    try {
      chmodSync(cliodeckDir, 0o755);
    } catch (error) {
      console.warn(`⚠️  Could not set permissions on ${cliodeckDir}:`, error);
    }

    // Ouvrir la base de données
    this.db = new Database(this.dbPath);
    console.log('✅ Primary sources database opened');

    try {
      if (existsSync(this.dbPath)) {
        chmodSync(this.dbPath, 0o644);
      }
    } catch (error) {
      console.warn(`⚠️  Could not set permissions on ${this.dbPath}:`, error);
    }

    this.enableForeignKeys();
    this.createTables();
  }

  private enableForeignKeys(): void {
    this.db.pragma('foreign_keys = ON');
  }

  private createTables(): void {
    // Table principale des sources primaires
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS primary_sources (
        id TEXT PRIMARY KEY,
        tropy_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        date TEXT,
        creator TEXT,
        archive TEXT,
        collection TEXT,
        type TEXT,
        transcription TEXT,
        transcription_source TEXT,
        language TEXT,
        last_modified TEXT NOT NULL,
        indexed_at TEXT NOT NULL,
        metadata TEXT
      );
    `);

    // Table des photos associées aux sources
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS source_photos (
        id INTEGER PRIMARY KEY,
        source_id TEXT NOT NULL,
        path TEXT NOT NULL,
        filename TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        mimetype TEXT,
        has_transcription INTEGER DEFAULT 0,
        transcription TEXT,
        FOREIGN KEY (source_id) REFERENCES primary_sources(id) ON DELETE CASCADE
      );
    `);

    // Table des chunks avec embeddings
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS source_chunks (
        id TEXT PRIMARY KEY,
        source_id TEXT NOT NULL,
        content TEXT NOT NULL,
        chunk_index INTEGER NOT NULL,
        start_position INTEGER NOT NULL,
        end_position INTEGER NOT NULL,
        embedding BLOB,
        FOREIGN KEY (source_id) REFERENCES primary_sources(id) ON DELETE CASCADE
      );
    `);

    // Table des tags (many-to-many)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS source_tags (
        source_id TEXT NOT NULL,
        tag TEXT NOT NULL,
        PRIMARY KEY (source_id, tag),
        FOREIGN KEY (source_id) REFERENCES primary_sources(id) ON DELETE CASCADE
      );
    `);

    // Table pour stocker les infos du projet Tropy lié
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tropy_projects (
        id TEXT PRIMARY KEY,
        tpy_path TEXT NOT NULL,
        name TEXT NOT NULL,
        last_sync TEXT NOT NULL,
        auto_sync INTEGER DEFAULT 0
      );
    `);

    // Indexes pour performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_source_chunks_source ON source_chunks(source_id);
      CREATE INDEX IF NOT EXISTS idx_source_tags_tag ON source_tags(tag);
      CREATE INDEX IF NOT EXISTS idx_source_photos_source ON source_photos(source_id);
      CREATE INDEX IF NOT EXISTS idx_primary_sources_tropy_id ON primary_sources(tropy_id);
      CREATE INDEX IF NOT EXISTS idx_primary_sources_archive ON primary_sources(archive);
      CREATE INDEX IF NOT EXISTS idx_primary_sources_collection ON primary_sources(collection);
    `);

    console.log('✅ Primary sources tables created');
  }

  // MARK: - Source CRUD

  /**
   * Sauvegarde une source primaire
   */
  saveSource(source: PrimarySourceItem): string {
    const id = source.id || randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO primary_sources
      (id, tropy_id, title, date, creator, archive, collection, type,
       transcription, transcription_source, language, last_modified, indexed_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      source.tropyId,
      source.title,
      source.date || null,
      source.creator || null,
      source.archive || null,
      source.collection || null,
      source.type || null,
      source.transcription || null,
      source.transcriptionSource || null,
      null, // language - à détecter plus tard
      source.lastModified.toISOString(),
      now,
      source.metadata ? JSON.stringify(source.metadata) : null
    );

    // Sauvegarder les photos
    this.saveSourcePhotos(id, source.photos);

    // Sauvegarder les tags
    this.saveSourceTags(id, source.tags);

    return id;
  }

  /**
   * Met à jour une source existante
   */
  updateSource(id: string, updates: Partial<PrimarySourceItem>): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }
    if (updates.date !== undefined) {
      fields.push('date = ?');
      values.push(updates.date);
    }
    if (updates.creator !== undefined) {
      fields.push('creator = ?');
      values.push(updates.creator);
    }
    if (updates.archive !== undefined) {
      fields.push('archive = ?');
      values.push(updates.archive);
    }
    if (updates.collection !== undefined) {
      fields.push('collection = ?');
      values.push(updates.collection);
    }
    if (updates.transcription !== undefined) {
      fields.push('transcription = ?');
      values.push(updates.transcription);
    }
    if (updates.transcriptionSource !== undefined) {
      fields.push('transcription_source = ?');
      values.push(updates.transcriptionSource);
    }
    if (updates.lastModified !== undefined) {
      fields.push('last_modified = ?');
      values.push(updates.lastModified.toISOString());
    }

    if (fields.length === 0) return;

    values.push(id);
    const stmt = this.db.prepare(`UPDATE primary_sources SET ${fields.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    // Mettre à jour les tags si fournis
    if (updates.tags) {
      this.saveSourceTags(id, updates.tags);
    }
  }

  /**
   * Récupère une source par son ID
   */
  getSource(id: string): PrimarySourceDocument | null {
    const row = this.db.prepare('SELECT * FROM primary_sources WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.rowToDocument(row);
  }

  /**
   * Récupère une source par son ID Tropy
   */
  getSourceByTropyId(tropyId: number): PrimarySourceDocument | null {
    const row = this.db
      .prepare('SELECT * FROM primary_sources WHERE tropy_id = ?')
      .get(tropyId) as any;
    if (!row) return null;
    return this.rowToDocument(row);
  }

  /**
   * Liste toutes les sources
   */
  getAllSources(): PrimarySourceDocument[] {
    const rows = this.db.prepare('SELECT * FROM primary_sources ORDER BY title').all() as any[];
    return rows.map((row) => this.rowToDocument(row));
  }

  /**
   * Supprime une source
   */
  deleteSource(id: string): void {
    this.db.prepare('DELETE FROM primary_sources WHERE id = ?').run(id);
  }

  /**
   * Vérifie si une source existe par son ID Tropy
   */
  sourceExistsByTropyId(tropyId: number): boolean {
    const row = this.db
      .prepare('SELECT 1 FROM primary_sources WHERE tropy_id = ?')
      .get(tropyId);
    return row !== undefined;
  }

  // MARK: - Photos

  private saveSourcePhotos(sourceId: string, photos: PrimarySourcePhoto[]): void {
    // Supprimer les photos existantes
    this.db.prepare('DELETE FROM source_photos WHERE source_id = ?').run(sourceId);

    const stmt = this.db.prepare(`
      INSERT INTO source_photos
      (id, source_id, path, filename, width, height, mimetype, has_transcription, transcription)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const photo of photos) {
      stmt.run(
        photo.id,
        sourceId,
        photo.path,
        photo.filename,
        photo.width || null,
        photo.height || null,
        photo.mimetype || null,
        photo.hasTranscription ? 1 : 0,
        photo.transcription || null
      );
    }
  }

  /**
   * Récupère les photos d'une source
   */
  getSourcePhotos(sourceId: string): PrimarySourcePhoto[] {
    const rows = this.db
      .prepare('SELECT * FROM source_photos WHERE source_id = ?')
      .all(sourceId) as any[];

    return rows.map((row) => ({
      id: row.id,
      path: row.path,
      filename: row.filename,
      width: row.width,
      height: row.height,
      mimetype: row.mimetype,
      hasTranscription: row.has_transcription === 1,
      transcription: row.transcription,
      notes: [],
    }));
  }

  /**
   * Met à jour la transcription d'une photo
   */
  updatePhotoTranscription(photoId: number, transcription: string): void {
    this.db
      .prepare('UPDATE source_photos SET transcription = ?, has_transcription = 1 WHERE id = ?')
      .run(transcription, photoId);
  }

  // MARK: - Tags

  private saveSourceTags(sourceId: string, tags: string[]): void {
    // Supprimer les tags existants
    this.db.prepare('DELETE FROM source_tags WHERE source_id = ?').run(sourceId);

    const stmt = this.db.prepare('INSERT INTO source_tags (source_id, tag) VALUES (?, ?)');
    for (const tag of tags) {
      stmt.run(sourceId, tag);
    }
  }

  /**
   * Récupère les tags d'une source
   */
  getSourceTags(sourceId: string): string[] {
    const rows = this.db
      .prepare('SELECT tag FROM source_tags WHERE source_id = ?')
      .all(sourceId) as any[];
    return rows.map((row) => row.tag);
  }

  /**
   * Liste tous les tags uniques
   */
  getAllTags(): string[] {
    const rows = this.db.prepare('SELECT DISTINCT tag FROM source_tags ORDER BY tag').all() as any[];
    return rows.map((row) => row.tag);
  }

  // MARK: - Chunks & Embeddings

  /**
   * Sauvegarde un chunk avec son embedding
   */
  saveChunk(chunk: PrimarySourceChunk, embedding: Float32Array): void {
    const embeddingBuffer = Buffer.from(embedding.buffer);

    this.db
      .prepare(
        `
      INSERT OR REPLACE INTO source_chunks
      (id, source_id, content, chunk_index, start_position, end_position, embedding)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `
      )
      .run(
        chunk.id,
        chunk.sourceId,
        chunk.content,
        chunk.chunkIndex,
        chunk.startPosition,
        chunk.endPosition,
        embeddingBuffer
      );
  }

  /**
   * Sauvegarde plusieurs chunks
   */
  saveChunks(chunks: Array<{ chunk: PrimarySourceChunk; embedding: Float32Array }>): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO source_chunks
      (id, source_id, content, chunk_index, start_position, end_position, embedding)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      for (const { chunk, embedding } of chunks) {
        const embeddingBuffer = Buffer.from(embedding.buffer);
        stmt.run(
          chunk.id,
          chunk.sourceId,
          chunk.content,
          chunk.chunkIndex,
          chunk.startPosition,
          chunk.endPosition,
          embeddingBuffer
        );
      }
    });

    transaction();
  }

  /**
   * Récupère tous les chunks d'une source
   */
  getChunks(sourceId: string): PrimarySourceChunk[] {
    const rows = this.db
      .prepare('SELECT * FROM source_chunks WHERE source_id = ? ORDER BY chunk_index')
      .all(sourceId) as any[];

    return rows.map((row) => ({
      id: row.id,
      sourceId: row.source_id,
      content: row.content,
      chunkIndex: row.chunk_index,
      startPosition: row.start_position,
      endPosition: row.end_position,
    }));
  }

  /**
   * Récupère tous les chunks avec leurs embeddings
   */
  getAllChunksWithEmbeddings(): Array<{ chunk: PrimarySourceChunk; embedding: Float32Array }> {
    const rows = this.db.prepare('SELECT * FROM source_chunks').all() as any[];

    return rows.map((row) => ({
      chunk: {
        id: row.id,
        sourceId: row.source_id,
        content: row.content,
        chunkIndex: row.chunk_index,
        startPosition: row.start_position,
        endPosition: row.end_position,
      },
      embedding: row.embedding
        ? new Float32Array(row.embedding.buffer, row.embedding.byteOffset, row.embedding.byteLength / 4)
        : new Float32Array(0),
    }));
  }

  /**
   * Supprime les chunks d'une source
   */
  deleteChunks(sourceId: string): void {
    this.db.prepare('DELETE FROM source_chunks WHERE source_id = ?').run(sourceId);
  }

  // MARK: - Search (Basic cosine similarity)

  /**
   * Recherche par similarité cosinus
   * Note: Pour de meilleures performances, utiliser HNSWVectorStore
   */
  search(queryEmbedding: Float32Array, topK: number = 10): PrimarySourceSearchResult[] {
    const chunks = this.getAllChunksWithEmbeddings();
    const results: PrimarySourceSearchResult[] = [];

    for (const { chunk, embedding } of chunks) {
      if (embedding.length === 0) continue;

      const similarity = this.cosineSimilarity(queryEmbedding, embedding);
      const source = this.getSource(chunk.sourceId);

      if (source) {
        results.push({
          chunk,
          source,
          similarity,
          sourceType: 'primary',
        });
      }
    }

    // Trier par similarité décroissante
    results.sort((a, b) => b.similarity - a.similarity);

    return results.slice(0, topK);
  }

  private cosineSimilarity(a: Float32Array, b: Float32Array): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  // MARK: - Statistics

  /**
   * Retourne les statistiques du store
   */
  getStatistics(): PrimarySourcesStatistics {
    const sourceCount = (
      this.db.prepare('SELECT COUNT(*) as count FROM primary_sources').get() as any
    ).count;

    const chunkCount = (
      this.db.prepare('SELECT COUNT(*) as count FROM source_chunks').get() as any
    ).count;

    const photoCount = (
      this.db.prepare('SELECT COUNT(*) as count FROM source_photos').get() as any
    ).count;

    const withTranscription = (
      this.db
        .prepare('SELECT COUNT(*) as count FROM primary_sources WHERE transcription IS NOT NULL')
        .get() as any
    ).count;

    // Compter par archive
    const archiveRows = this.db
      .prepare(
        'SELECT archive, COUNT(*) as count FROM primary_sources WHERE archive IS NOT NULL GROUP BY archive'
      )
      .all() as any[];
    const byArchive: Record<string, number> = {};
    for (const row of archiveRows) {
      byArchive[row.archive] = row.count;
    }

    // Compter par collection
    const collectionRows = this.db
      .prepare(
        'SELECT collection, COUNT(*) as count FROM primary_sources WHERE collection IS NOT NULL GROUP BY collection'
      )
      .all() as any[];
    const byCollection: Record<string, number> = {};
    for (const row of collectionRows) {
      byCollection[row.collection] = row.count;
    }

    return {
      sourceCount,
      chunkCount,
      photoCount,
      withTranscription,
      withoutTranscription: sourceCount - withTranscription,
      byArchive,
      byCollection,
      tags: this.getAllTags(),
    };
  }

  // MARK: - Tropy Project Management

  /**
   * Enregistre un projet Tropy lié
   */
  saveTropyProject(tpyPath: string, name: string, autoSync: boolean = false): string {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db
      .prepare(
        `
      INSERT OR REPLACE INTO tropy_projects (id, tpy_path, name, last_sync, auto_sync)
      VALUES (?, ?, ?, ?, ?)
    `
      )
      .run(id, tpyPath, name, now, autoSync ? 1 : 0);

    return id;
  }

  /**
   * Met à jour la date de dernière sync
   */
  updateLastSync(tpyPath: string): void {
    const now = new Date().toISOString();
    this.db.prepare('UPDATE tropy_projects SET last_sync = ? WHERE tpy_path = ?').run(now, tpyPath);
  }

  /**
   * Récupère le projet Tropy enregistré
   */
  getTropyProject(): { id: string; tpyPath: string; name: string; lastSync: string; autoSync: boolean } | null {
    const row = this.db.prepare('SELECT * FROM tropy_projects LIMIT 1').get() as any;
    if (!row) return null;

    return {
      id: row.id,
      tpyPath: row.tpy_path,
      name: row.name,
      lastSync: row.last_sync,
      autoSync: row.auto_sync === 1,
    };
  }

  // MARK: - Utilities

  private rowToDocument(row: any): PrimarySourceDocument {
    return {
      id: row.id,
      tropyId: row.tropy_id,
      title: row.title,
      date: row.date,
      creator: row.creator,
      archive: row.archive,
      collection: row.collection,
      type: row.type,
      transcription: row.transcription,
      transcriptionSource: row.transcription_source,
      language: row.language,
      lastModified: row.last_modified,
      indexedAt: row.indexed_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  /**
   * Retourne le chemin de la base de données
   */
  getDatabasePath(): string {
    return this.dbPath;
  }

  /**
   * Détecte la dimension des embeddings
   */
  getEmbeddingDimension(): number | null {
    const row = this.db
      .prepare('SELECT embedding FROM source_chunks WHERE embedding IS NOT NULL LIMIT 1')
      .get() as any;

    if (!row || !row.embedding) return null;

    return row.embedding.byteLength / 4; // Float32 = 4 bytes
  }

  /**
   * Ferme la connexion à la base de données
   */
  close(): void {
    this.db.close();
    console.log('✅ Primary sources database closed');
  }
}
