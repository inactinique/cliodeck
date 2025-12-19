import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import type {
  PDFDocument,
  DocumentChunk,
  ChunkWithEmbedding,
  SearchResult,
  VectorStoreStatistics,
} from '../../types/pdf-document';

export class VectorStore {
  private db: Database.Database;
  private dbPath: string;

  constructor(projectPath?: string) {
    // Path: userData/mdfocus/vectors.db ou project/.mdfocus/vectors.db
    if (projectPath) {
      this.dbPath = path.join(projectPath, '.mdfocus', 'vectors.db');
    } else {
      const userDataPath = app.getPath('userData');
      const appFolder = path.join(userDataPath, 'mdfocus');
      this.dbPath = path.join(appFolder, 'vectors.db');
    }

    console.log(`📁 Base de données: ${this.dbPath}`);

    // Créer le dossier parent si nécessaire
    const dir = path.dirname(this.dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Ouvrir la base de données
    this.db = new Database(this.dbPath);
    console.log('✅ Base de données ouverte');

    // ✅ IMPORTANT : Activer les clés étrangères (désactivées par défaut dans SQLite)
    this.enableForeignKeys();

    // Créer les tables
    this.createTables();
  }

  private enableForeignKeys(): void {
    this.db.pragma('foreign_keys = ON');
    console.log('✅ Clés étrangères activées');
  }

  private createTables(): void {
    // Table pour les documents
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        file_path TEXT NOT NULL,
        title TEXT NOT NULL,
        author TEXT,
        year TEXT,
        bibtex_key TEXT,
        page_count INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        indexed_at TEXT NOT NULL,
        last_accessed_at TEXT NOT NULL,
        metadata TEXT
      );
    `);

    // Table pour les chunks avec embeddings
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS chunks (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        content TEXT NOT NULL,
        page_number INTEGER NOT NULL,
        chunk_index INTEGER NOT NULL,
        start_position INTEGER NOT NULL,
        end_position INTEGER NOT NULL,
        embedding BLOB,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
      );
    `);

    // Index pour accélérer les recherches
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
      CREATE INDEX IF NOT EXISTS idx_chunks_page_number ON chunks(page_number);
    `);

    console.log('✅ Tables créées');
  }

  // MARK: - Document Operations

  saveDocument(document: PDFDocument): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO documents
      (id, file_path, title, author, year, bibtex_key, page_count,
       created_at, indexed_at, last_accessed_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const metadataJSON = JSON.stringify(document.metadata);

    stmt.run(
      document.id,
      document.fileURL,
      document.title,
      document.author || null,
      document.year || null,
      document.bibtexKey || null,
      document.pageCount,
      document.createdAt.toISOString(),
      document.indexedAt.toISOString(),
      document.lastAccessedAt.toISOString(),
      metadataJSON
    );

    console.log(`✅ Document sauvegardé: ${document.title}`);
  }

  getDocument(id: string): PDFDocument | null {
    const stmt = this.db.prepare('SELECT * FROM documents WHERE id = ?');
    const row = stmt.get(id);

    if (!row) return null;

    return this.parseDocument(row as any);
  }

  getAllDocuments(): PDFDocument[] {
    const stmt = this.db.prepare('SELECT * FROM documents ORDER BY indexed_at DESC');
    const rows = stmt.all();

    return rows.map((row) => this.parseDocument(row as any));
  }

  deleteDocument(id: string): void {
    // Les chunks seront supprimés automatiquement grâce à ON DELETE CASCADE
    const stmt = this.db.prepare('DELETE FROM documents WHERE id = ?');
    stmt.run(id);

    console.log(`✅ Document supprimé: ${id}`);
  }

  // MARK: - Chunk Operations

  saveChunk(chunk: DocumentChunk, embedding: Float32Array): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO chunks
      (id, document_id, content, page_number, chunk_index,
       start_position, end_position, embedding)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    // Convertir Float32Array en Buffer
    const embeddingBuffer = Buffer.from(embedding.buffer);

    stmt.run(
      chunk.id,
      chunk.documentId,
      chunk.content,
      chunk.pageNumber,
      chunk.chunkIndex,
      chunk.startPosition,
      chunk.endPosition,
      embeddingBuffer
    );
  }

  getChunksForDocument(documentId: string): ChunkWithEmbedding[] {
    const stmt = this.db.prepare(
      'SELECT * FROM chunks WHERE document_id = ? ORDER BY chunk_index'
    );
    const rows = stmt.all(documentId);

    return rows.map((row) => this.parseChunkWithEmbedding(row as any));
  }

  getAllChunksWithEmbeddings(): ChunkWithEmbedding[] {
    const stmt = this.db.prepare('SELECT * FROM chunks WHERE embedding IS NOT NULL');
    const rows = stmt.all();

    return rows.map((row) => this.parseChunkWithEmbedding(row as any));
  }

  // MARK: - Search Operations

  search(
    queryEmbedding: Float32Array,
    limit: number = 5,
    documentIds?: string[]
  ): SearchResult[] {
    // Récupérer tous les chunks (avec filtre optionnel par documents)
    let allChunks: ChunkWithEmbedding[];

    if (documentIds && documentIds.length > 0) {
      allChunks = [];
      for (const docId of documentIds) {
        const chunks = this.getChunksForDocument(docId);
        allChunks.push(...chunks);
      }
    } else {
      allChunks = this.getAllChunksWithEmbeddings();
    }

    // Calculer la similarité cosinus pour chaque chunk
    const scoredChunks: Array<{ chunkWithEmbedding: ChunkWithEmbedding; similarity: number }> =
      [];

    for (const chunkWithEmbedding of allChunks) {
      const similarity = this.cosineSimilarity(queryEmbedding, chunkWithEmbedding.embedding);
      scoredChunks.push({ chunkWithEmbedding, similarity });
    }

    // Trier par similarité décroissante
    scoredChunks.sort((a, b) => b.similarity - a.similarity);

    // Prendre les top-k
    const topChunks = scoredChunks.slice(0, limit);

    // Convertir en SearchResult
    const results: SearchResult[] = [];

    for (const { chunkWithEmbedding, similarity } of topChunks) {
      const document = this.getDocument(chunkWithEmbedding.chunk.documentId);
      if (document) {
        results.push({
          chunk: chunkWithEmbedding.chunk,
          document,
          similarity,
        });
      }
    }

    return results;
  }

  // MARK: - Similarity Calculation

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

    if (denominator === 0) return 0;

    return dotProduct / denominator;
  }

  // MARK: - Parsing Helpers

  private parseDocument(row: any): PDFDocument {
    const metadata = JSON.parse(row.metadata || '{}');

    const doc: PDFDocument = {
      id: row.id,
      fileURL: row.file_path,
      title: row.title,
      author: row.author,
      year: row.year,
      bibtexKey: row.bibtex_key,
      pageCount: row.page_count,
      metadata,
      createdAt: new Date(row.created_at),
      indexedAt: new Date(row.indexed_at),
      lastAccessedAt: new Date(row.last_accessed_at),
      get displayString() {
        if (this.author && this.year) {
          return `${this.author} (${this.year})`;
        }
        return this.title;
      },
    };

    return doc;
  }

  private parseChunkWithEmbedding(row: any): ChunkWithEmbedding {
    const chunk: DocumentChunk = {
      id: row.id,
      documentId: row.document_id,
      content: row.content,
      pageNumber: row.page_number,
      chunkIndex: row.chunk_index,
      startPosition: row.start_position,
      endPosition: row.end_position,
    };

    // Extraire l'embedding du BLOB
    const embeddingBuffer = row.embedding as Buffer;
    const embedding = new Float32Array(
      embeddingBuffer.buffer,
      embeddingBuffer.byteOffset,
      embeddingBuffer.byteLength / Float32Array.BYTES_PER_ELEMENT
    );

    return { chunk, embedding };
  }

  // MARK: - Statistics

  getStatistics(): VectorStoreStatistics {
    const documentCount = this.db.prepare('SELECT COUNT(*) as count FROM documents').get() as {
      count: number;
    };
    const chunkCount = this.db.prepare('SELECT COUNT(*) as count FROM chunks').get() as {
      count: number;
    };
    const embeddingCount = this.db
      .prepare('SELECT COUNT(*) as count FROM chunks WHERE embedding IS NOT NULL')
      .get() as { count: number };

    return {
      documentCount: documentCount.count,
      chunkCount: chunkCount.count,
      embeddingCount: embeddingCount.count,
      databasePath: this.dbPath,
    };
  }

  // MARK: - Purge complète

  purgeAllData(): void {
    // Supprimer tous les chunks d'abord (pour être sûr)
    this.db.exec('DELETE FROM chunks;');

    // Supprimer tous les documents
    this.db.exec('DELETE FROM documents;');

    // Vacuum pour récupérer l'espace disque
    this.db.exec('VACUUM;');

    console.log('✅ Base de données purgée complètement');
  }

  verifyIntegrity(): { orphanedChunks: number; totalChunks: number } {
    // Compter les chunks orphelins (dont le document n'existe plus)
    const orphanedCount = this.db
      .prepare(
        `SELECT COUNT(*) as count FROM chunks
         WHERE document_id NOT IN (SELECT id FROM documents)`
      )
      .get() as { count: number };

    // Compter tous les chunks
    const totalCount = this.db.prepare('SELECT COUNT(*) as count FROM chunks').get() as {
      count: number;
    };

    if (orphanedCount.count > 0) {
      console.log(
        `⚠️ ${orphanedCount.count} chunks orphelins détectés sur ${totalCount.count} total`
      );
    }

    return {
      orphanedChunks: orphanedCount.count,
      totalChunks: totalCount.count,
    };
  }

  cleanOrphanedChunks(): void {
    // Supprimer les chunks orphelins
    this.db.exec(`
      DELETE FROM chunks
      WHERE document_id NOT IN (SELECT id FROM documents)
    `);

    console.log('✅ Chunks orphelins supprimés');
  }

  // Fermer la base de données
  close(): void {
    this.db.close();
    console.log('✅ Base de données fermée');
  }
}
