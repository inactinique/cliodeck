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
        metadata TEXT,
        summary TEXT,
        summary_embedding BLOB,
        citations_extracted TEXT,
        language TEXT
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

    // Table pour les citations entre documents
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS document_citations (
        id TEXT PRIMARY KEY,
        source_doc_id TEXT NOT NULL,
        target_citation TEXT NOT NULL,
        target_doc_id TEXT,
        context TEXT,
        page_number INTEGER,
        FOREIGN KEY (source_doc_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY (target_doc_id) REFERENCES documents(id) ON DELETE SET NULL
      );
    `);

    // Table pour les similarités pré-calculées (optionnel, pour performance)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS document_similarities (
        doc_id_1 TEXT NOT NULL,
        doc_id_2 TEXT NOT NULL,
        similarity REAL NOT NULL,
        PRIMARY KEY (doc_id_1, doc_id_2),
        FOREIGN KEY (doc_id_1) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY (doc_id_2) REFERENCES documents(id) ON DELETE CASCADE
      );
    `);

    // Index pour accélérer les recherches
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
      CREATE INDEX IF NOT EXISTS idx_chunks_page_number ON chunks(page_number);
      CREATE INDEX IF NOT EXISTS idx_citations_source ON document_citations(source_doc_id);
      CREATE INDEX IF NOT EXISTS idx_citations_target ON document_citations(target_doc_id);
      CREATE INDEX IF NOT EXISTS idx_similarities_doc1 ON document_similarities(doc_id_1);
      CREATE INDEX IF NOT EXISTS idx_similarities_doc2 ON document_similarities(doc_id_2);
    `);

    console.log('✅ Tables créées');

    // Vérifier et migrer si nécessaire
    this.migrateDatabase();
  }

  private migrateDatabase(): void {
    // Vérifier si les nouvelles colonnes existent déjà
    const tableInfo = this.db.pragma('table_info(documents)') as Array<{ name: string }>;
    const columnNames = tableInfo.map((col) => col.name);

    const newColumns = [
      { name: 'summary', type: 'TEXT', default: 'NULL' },
      { name: 'summary_embedding', type: 'BLOB', default: 'NULL' },
      { name: 'citations_extracted', type: 'TEXT', default: 'NULL' },
      { name: 'language', type: 'TEXT', default: 'NULL' },
    ];

    for (const column of newColumns) {
      if (!columnNames.includes(column.name)) {
        console.log(`📝 Migration: Ajout de la colonne ${column.name}`);
        this.db.exec(
          `ALTER TABLE documents ADD COLUMN ${column.name} ${column.type} DEFAULT ${column.default}`
        );
      }
    }

    console.log('✅ Migration de la base de données terminée');
  }

  // MARK: - Document Operations

  saveDocument(document: PDFDocument): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO documents
      (id, file_path, title, author, year, bibtex_key, page_count,
       created_at, indexed_at, last_accessed_at, metadata,
       summary, summary_embedding, citations_extracted, language)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const metadataJSON = JSON.stringify(document.metadata);
    const citationsJSON = (document as any).citationsExtracted
      ? JSON.stringify((document as any).citationsExtracted)
      : null;

    // Convertir summary_embedding en Buffer si présent
    const summaryEmbeddingBuffer = (document as any).summaryEmbedding
      ? Buffer.from((document as any).summaryEmbedding.buffer)
      : null;

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
      metadataJSON,
      (document as any).summary || null,
      summaryEmbeddingBuffer,
      citationsJSON,
      (document as any).language || null
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

    return rows.map((row) => {
      const doc = this.parseDocument(row as any);
      // Add chunk count for this document
      const chunkCountStmt = this.db.prepare('SELECT COUNT(*) as count FROM chunks WHERE document_id = ?');
      const chunkCountRow = chunkCountStmt.get(doc.id) as { count: number };
      (doc as any).chunkCount = chunkCountRow.count;
      return doc;
    });
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
    const citationsExtracted = row.citations_extracted
      ? JSON.parse(row.citations_extracted)
      : undefined;

    // Extraire summary_embedding si présent
    let summaryEmbedding: Float32Array | undefined = undefined;
    if (row.summary_embedding) {
      const embeddingBuffer = row.summary_embedding as Buffer;
      summaryEmbedding = new Float32Array(
        embeddingBuffer.buffer,
        embeddingBuffer.byteOffset,
        embeddingBuffer.byteLength / Float32Array.BYTES_PER_ELEMENT
      );
    }

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

    // Ajouter les nouveaux champs enrichis
    (doc as any).summary = row.summary;
    (doc as any).summaryEmbedding = summaryEmbedding;
    (doc as any).citationsExtracted = citationsExtracted;
    (doc as any).language = row.language;

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

  // MARK: - Citation Operations

  saveCitation(citation: {
    id: string;
    sourceDocId: string;
    targetCitation: string;
    targetDocId?: string;
    context?: string;
    pageNumber?: number;
  }): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO document_citations
      (id, source_doc_id, target_citation, target_doc_id, context, page_number)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      citation.id,
      citation.sourceDocId,
      citation.targetCitation,
      citation.targetDocId || null,
      citation.context || null,
      citation.pageNumber || null
    );
  }

  getCitationsForDocument(documentId: string): Array<{
    id: string;
    sourceDocId: string;
    targetCitation: string;
    targetDocId?: string;
    context?: string;
    pageNumber?: number;
  }> {
    const stmt = this.db.prepare(`
      SELECT * FROM document_citations
      WHERE source_doc_id = ?
      ORDER BY page_number ASC
    `);

    const rows = stmt.all(documentId) as any[];

    return rows.map((row) => ({
      id: row.id,
      sourceDocId: row.source_doc_id,
      targetCitation: row.target_citation,
      targetDocId: row.target_doc_id,
      context: row.context,
      pageNumber: row.page_number,
    }));
  }

  getDocumentsCitedBy(documentId: string): string[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT target_doc_id FROM document_citations
      WHERE source_doc_id = ? AND target_doc_id IS NOT NULL
    `);

    const rows = stmt.all(documentId) as Array<{ target_doc_id: string }>;
    return rows.map((row) => row.target_doc_id);
  }

  getDocumentsCiting(documentId: string): string[] {
    const stmt = this.db.prepare(`
      SELECT DISTINCT source_doc_id FROM document_citations
      WHERE target_doc_id = ?
    `);

    const rows = stmt.all(documentId) as Array<{ source_doc_id: string }>;
    return rows.map((row) => row.source_doc_id);
  }

  deleteCitationsForDocument(documentId: string): void {
    const stmt = this.db.prepare('DELETE FROM document_citations WHERE source_doc_id = ?');
    stmt.run(documentId);
  }

  // MARK: - Similarity Operations

  saveSimilarity(docId1: string, docId2: string, similarity: number): void {
    // Toujours stocker avec docId1 < docId2 pour éviter les doublons
    const [id1, id2] = docId1 < docId2 ? [docId1, docId2] : [docId2, docId1];

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO document_similarities
      (doc_id_1, doc_id_2, similarity)
      VALUES (?, ?, ?)
    `);

    stmt.run(id1, id2, similarity);
  }

  getSimilarDocuments(
    documentId: string,
    threshold: number = 0.5,
    limit: number = 10
  ): Array<{ documentId: string; similarity: number }> {
    const stmt = this.db.prepare(`
      SELECT
        CASE
          WHEN doc_id_1 = ? THEN doc_id_2
          ELSE doc_id_1
        END as other_doc_id,
        similarity
      FROM document_similarities
      WHERE (doc_id_1 = ? OR doc_id_2 = ?)
        AND similarity >= ?
      ORDER BY similarity DESC
      LIMIT ?
    `);

    const rows = stmt.all(documentId, documentId, documentId, threshold, limit) as Array<{
      other_doc_id: string;
      similarity: number;
    }>;

    return rows.map((row) => ({
      documentId: row.other_doc_id,
      similarity: row.similarity,
    }));
  }

  deleteSimilaritiesForDocument(documentId: string): void {
    const stmt = this.db.prepare(
      'DELETE FROM document_similarities WHERE doc_id_1 = ? OR doc_id_2 = ?'
    );
    stmt.run(documentId, documentId);
  }

  // Fermer la base de données
  close(): void {
    this.db.close();
    console.log('✅ Base de données fermée');
  }
}
