import hnswlib from 'hnswlib-node';
import { VectorStore } from './VectorStore';
import type { SearchResult, DocumentChunk } from '../../types/pdf-document';
import * as path from 'path';
import * as fs from 'fs';

const { HierarchicalNSW } = hnswlib;
type HierarchicalNSW = InstanceType<typeof HierarchicalNSW>;

/**
 * HNSW-based vector store for fast approximate nearest neighbor search
 *
 * Performance characteristics:
 * - Memory: ~500 MB for 50k chunks (768-dim vectors)
 * - Search time: O(log n) - typically 10-20ms for 50k chunks
 * - Index build time: O(n log n) - about 1-2s per 1000 chunks
 *
 * Configuration:
 * - M=16: Number of bi-directional links per node (trade-off: memory vs accuracy)
 * - efConstruction=100: Size of dynamic candidate list during construction
 * - efSearch=50: Size of dynamic candidate list during search (configurable)
 */
export class HNSWVectorStore {
  private index: HierarchicalNSW | null = null;
  private dimension: number;
  private maxElements: number;
  private indexPath: string;
  private chunkIdMap: Map<number, string>; // HNSW label -> chunk ID
  private chunkDataMap: Map<string, DocumentChunk>; // chunk ID -> chunk data
  private isInitialized: boolean = false;
  private currentSize: number = 0;

  // HNSW parameters
  private readonly M = 16; // Number of connections per layer (default: 16)
  private readonly efConstruction = 100; // Construction-time accuracy (default: 200, reduced for RAM)
  private efSearch = 50; // Search-time accuracy (default: 50)

  constructor(
    projectPath: string,
    dimension: number = 768,
    maxElements: number = 100000
  ) {
    this.dimension = dimension;
    this.maxElements = maxElements;
    this.indexPath = path.join(projectPath, '.mdfocus', 'hnsw.index');
    this.chunkIdMap = new Map();
    this.chunkDataMap = new Map();
  }

  /**
   * Initialize or load existing HNSW index
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    this.index = new HierarchicalNSW('cosine', this.dimension);

    // Try to load existing index
    if (fs.existsSync(this.indexPath)) {
      try {
        console.log('📂 Loading existing HNSW index from', this.indexPath);
        this.index.readIndexSync(this.indexPath);
        this.currentSize = this.index.getCurrentCount();
        console.log(`✅ HNSW index loaded: ${this.currentSize} vectors`);
      } catch (error) {
        console.warn('⚠️  Failed to load HNSW index, creating new one:', error);
        this.index.initIndex(this.maxElements, this.M, this.efConstruction);
      }
    } else {
      console.log('🆕 Creating new HNSW index');
      this.index.initIndex(this.maxElements, this.M, this.efConstruction);
    }

    this.isInitialized = true;
  }

  /**
   * Add a chunk with its embedding to the index
   */
  async addChunk(chunk: DocumentChunk, embedding: Float32Array): Promise<void> {
    if (!this.isInitialized || !this.index) {
      await this.initialize();
    }

    if (this.currentSize >= this.maxElements) {
      throw new Error(`HNSW index is full (max ${this.maxElements} elements)`);
    }

    const label = this.currentSize;
    // Convert Float32Array to number[]
    const embeddingArray = Array.from(embedding);
    this.index!.addPoint(embeddingArray, label);
    this.chunkIdMap.set(label, chunk.id);
    this.chunkDataMap.set(chunk.id, chunk);
    this.currentSize++;
  }

  /**
   * Batch add chunks (more efficient than adding one by one)
   */
  async addChunks(chunks: Array<{ chunk: DocumentChunk; embedding: Float32Array }>): Promise<void> {
    if (!this.isInitialized || !this.index) {
      await this.initialize();
    }

    console.log(`📥 Adding ${chunks.length} chunks to HNSW index...`);
    const startTime = Date.now();

    for (const { chunk, embedding } of chunks) {
      if (this.currentSize >= this.maxElements) {
        console.warn(`⚠️  HNSW index full, stopping at ${this.currentSize} chunks`);
        break;
      }

      const label = this.currentSize;
      // Convert Float32Array to number[]
      const embeddingArray = Array.from(embedding);
      this.index!.addPoint(embeddingArray, label);
      this.chunkIdMap.set(label, chunk.id);
      this.chunkDataMap.set(chunk.id, chunk);
      this.currentSize++;
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Added ${chunks.length} chunks in ${duration}ms (${Math.round(chunks.length / (duration / 1000))} chunks/s)`);
  }

  /**
   * Search for nearest neighbors
   */
  async search(
    queryEmbedding: Float32Array,
    k: number = 10,
    documentIds?: string[]
  ): Promise<SearchResult[]> {
    if (!this.isInitialized || !this.index) {
      throw new Error('HNSW index not initialized');
    }

    if (this.currentSize === 0) {
      return [];
    }

    // Set search accuracy
    this.index.setEf(this.efSearch);

    // Perform search
    // Convert Float32Array to number[]
    const queryArray = Array.from(queryEmbedding);
    const result = this.index.searchKnn(queryArray, Math.min(k * 2, this.currentSize));

    // Convert labels to chunks
    const searchResults: SearchResult[] = [];

    for (let i = 0; i < result.neighbors.length; i++) {
      const label = result.neighbors[i];
      const similarity = 1 - result.distances[i]; // Convert distance to similarity

      const chunkId = this.chunkIdMap.get(label);
      if (!chunkId) continue;

      const chunk = this.chunkDataMap.get(chunkId);
      if (!chunk) continue;

      // Filter by document IDs if provided
      if (documentIds && !documentIds.includes(chunk.documentId)) {
        continue;
      }

      searchResults.push({
        chunk,
        similarity,
        document: null as any, // Will be populated by VectorStore wrapper
      });

      if (searchResults.length >= k) {
        break;
      }
    }

    return searchResults;
  }

  /**
   * Save index to disk
   */
  async save(): Promise<void> {
    if (!this.isInitialized || !this.index) {
      return;
    }

    console.log('💾 Saving HNSW index to disk...');
    const startTime = Date.now();

    // Ensure directory exists
    const dir = path.dirname(this.indexPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Save HNSW index
    this.index.writeIndexSync(this.indexPath);

    // Save metadata (chunk mappings)
    const metadataPath = this.indexPath + '.meta.json';
    const metadata = {
      dimension: this.dimension,
      currentSize: this.currentSize,
      chunkIdMap: Array.from(this.chunkIdMap.entries()),
      chunkDataMap: Array.from(this.chunkDataMap.entries()),
    };
    fs.writeFileSync(metadataPath, JSON.stringify(metadata));

    const duration = Date.now() - startTime;
    console.log(`✅ HNSW index saved in ${duration}ms`);
  }

  /**
   * Load metadata from disk
   */
  async loadMetadata(): Promise<void> {
    const metadataPath = this.indexPath + '.meta.json';

    if (!fs.existsSync(metadataPath)) {
      console.warn('⚠️  No metadata file found');
      return;
    }

    try {
      const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
      this.currentSize = metadata.currentSize;
      this.chunkIdMap = new Map(metadata.chunkIdMap);
      this.chunkDataMap = new Map(metadata.chunkDataMap);
      console.log(`✅ Loaded metadata: ${this.currentSize} chunks`);
    } catch (error) {
      console.error('❌ Failed to load metadata:', error);
    }
  }

  /**
   * Clear all data
   */
  async clear(): Promise<void> {
    this.index = new HierarchicalNSW('cosine', this.dimension);
    this.index.initIndex(this.maxElements, this.M, this.efConstruction);
    this.chunkIdMap.clear();
    this.chunkDataMap.clear();
    this.currentSize = 0;
    this.isInitialized = true;

    // Delete index files
    if (fs.existsSync(this.indexPath)) {
      fs.unlinkSync(this.indexPath);
    }
    const metadataPath = this.indexPath + '.meta.json';
    if (fs.existsSync(metadataPath)) {
      fs.unlinkSync(metadataPath);
    }
  }

  /**
   * Get statistics
   */
  getStats(): {
    dimension: number;
    currentSize: number;
    maxElements: number;
    M: number;
    efConstruction: number;
    efSearch: number;
  } {
    return {
      dimension: this.dimension,
      currentSize: this.currentSize,
      maxElements: this.maxElements,
      M: this.M,
      efConstruction: this.efConstruction,
      efSearch: this.efSearch,
    };
  }

  /**
   * Set search accuracy (higher = more accurate but slower)
   */
  setSearchAccuracy(ef: number): void {
    this.efSearch = Math.max(10, Math.min(500, ef));
  }

  /**
   * Check if chunk exists in index
   */
  hasChunk(chunkId: string): boolean {
    return this.chunkDataMap.has(chunkId);
  }

  /**
   * Get total number of chunks
   */
  getSize(): number {
    return this.currentSize;
  }
}
