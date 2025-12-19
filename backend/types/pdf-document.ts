export interface PDFMetadata {
  subject?: string;
  keywords?: string[];
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  [key: string]: any;
}

export interface PDFDocument {
  id: string;
  fileURL: string;
  title: string;
  author?: string;
  year?: string;
  bibtexKey?: string;
  pageCount: number;
  metadata: PDFMetadata;
  createdAt: Date;
  indexedAt: Date;
  lastAccessedAt: Date;

  // Computed property pour affichage
  get displayString(): string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  pageNumber: number;
  chunkIndex: number;
  startPosition: number;
  endPosition: number;
}

export interface ChunkWithEmbedding {
  chunk: DocumentChunk;
  embedding: Float32Array;
}

export interface SearchResult {
  chunk: DocumentChunk;
  document: PDFDocument;
  similarity: number;
}

export interface VectorStoreStatistics {
  documentCount: number;
  chunkCount: number;
  embeddingCount: number;
  databasePath: string;
}

export interface DocumentPage {
  pageNumber: number;
  text: string;
}
