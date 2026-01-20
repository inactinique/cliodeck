/**
 * Similarity Finder Service
 *
 * Analyzes user's document (document.md) and finds similar content
 * in the indexed PDF corpus. Provides contextual bibliographic recommendations.
 */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { pdfService } from './pdf-service.js';
import { projectManager } from './project-manager.js';

// MARK: - Types

export type Granularity = 'section' | 'paragraph' | 'sentence';

export interface SimilarityOptions {
  granularity: Granularity;
  maxResults: number;
  similarityThreshold: number;
  collectionFilter: string[] | null;
}

export interface TextSegment {
  id: string;
  content: string;
  startLine: number;
  endLine: number;
  type: Granularity;
  title?: string; // For sections: the heading text
}

export interface PDFRecommendation {
  pdfId: string;
  title: string;
  authors: string[];
  similarity: number;
  chunkPreview: string;
  zoteroKey?: string;
  pageNumber?: number;
}

export interface SimilarityResult {
  segmentId: string;
  segment: TextSegment;
  recommendations: PDFRecommendation[];
  analyzedAt: number;
}

export interface SimilarityCache {
  documentHash: string;
  vectorStoreHash: string;
  segments: Record<string, SimilarityResult>;
  createdAt: number;
  options: SimilarityOptions;
}

export interface AnalysisProgress {
  current: number;
  total: number;
  status: string;
  percentage: number;
  currentSegment?: string;
}

// MARK: - Default Options

const DEFAULT_OPTIONS: SimilarityOptions = {
  granularity: 'paragraph',
  maxResults: 5,
  // Note: pdfService.search() already applies its own threshold (typically 0.12)
  // and has a fallback mechanism. This threshold is for additional filtering.
  // For cross-language search (e.g., FR document → EN PDFs), scores are often
  // in the 0.01-0.05 range. Setting to 0 to rely on pdfService's built-in filtering.
  similarityThreshold: 0,
  collectionFilter: null,
};

// MARK: - Service

class SimilarityService {
  private abortController: AbortController | null = null;

  /**
   * Analyze a document and find similar PDFs for each segment
   */
  async analyzeDocument(
    text: string,
    options: Partial<SimilarityOptions> = {},
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<SimilarityResult[]> {
    const projectPath = projectManager.getCurrentProjectPath();
    if (!projectPath) {
      throw new Error('No project is currently open');
    }

    // Merge with defaults
    const opts: SimilarityOptions = { ...DEFAULT_OPTIONS, ...options };

    console.log('🔍 [SIMILARITY] Starting document analysis', {
      granularity: opts.granularity,
      maxResults: opts.maxResults,
      threshold: opts.similarityThreshold,
      textLength: text.length,
    });

    // Create abort controller for cancellation
    this.abortController = new AbortController();

    // Compute hashes for caching
    const documentHash = this.computeHash(text);
    const vectorStoreHash = await this.computeVectorStoreHash();

    // Try to load from cache
    const cache = await this.loadCache(projectPath);
    if (cache && this.isCacheValid(cache, documentHash, vectorStoreHash, opts)) {
      console.log('💾 [SIMILARITY] Using cached results');
      onProgress?.({
        current: 100,
        total: 100,
        status: 'Résultats en cache chargés',
        percentage: 100,
      });
      return Object.values(cache.segments);
    }

    // Segment the text
    const segments = this.segmentText(text, opts.granularity);
    console.log(`📝 [SIMILARITY] Document split into ${segments.length} segments`);

    if (segments.length === 0) {
      console.warn('⚠️  [SIMILARITY] No segments found in document');
      return [];
    }

    const results: SimilarityResult[] = [];
    const total = segments.length;

    // Process each segment
    for (let i = 0; i < segments.length; i++) {
      // Check for cancellation
      if (this.abortController?.signal.aborted) {
        console.log('⚠️  [SIMILARITY] Analysis cancelled');
        throw new Error('Analysis cancelled by user');
      }

      const segment = segments[i];
      const segmentTitle = segment.title || segment.content.substring(0, 50) + '...';

      onProgress?.({
        current: i + 1,
        total,
        status: `Analyse du segment ${i + 1}/${total}`,
        percentage: Math.round(((i + 1) / total) * 100),
        currentSegment: segmentTitle,
      });

      try {
        const recommendations = await this.findSimilarPDFs(segment, opts);

        results.push({
          segmentId: segment.id,
          segment,
          recommendations,
          analyzedAt: Date.now(),
        });
      } catch (error: any) {
        console.error(`❌ [SIMILARITY] Error analyzing segment ${i + 1}:`, error.message);
        // Continue with other segments
        results.push({
          segmentId: segment.id,
          segment,
          recommendations: [],
          analyzedAt: Date.now(),
        });
      }
    }

    // Save to cache
    await this.saveCache(projectPath, {
      documentHash,
      vectorStoreHash,
      segments: Object.fromEntries(results.map((r) => [r.segmentId, r])),
      createdAt: Date.now(),
      options: opts,
    });

    console.log('✅ [SIMILARITY] Analysis complete', {
      segmentsAnalyzed: results.length,
      totalRecommendations: results.reduce((sum, r) => sum + r.recommendations.length, 0),
    });

    return results;
  }

  /**
   * Cancel ongoing analysis
   */
  cancelAnalysis(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      console.log('⚠️  [SIMILARITY] Analysis cancellation requested');
    }
  }

  /**
   * Segment text based on granularity
   */
  segmentText(text: string, granularity: Granularity): TextSegment[] {
    switch (granularity) {
      case 'section':
        return this.segmentBySection(text);
      case 'paragraph':
        return this.segmentByParagraph(text);
      case 'sentence':
        return this.segmentBySentence(text);
      default:
        return this.segmentByParagraph(text);
    }
  }

  /**
   * Segment by Markdown headings (#, ##, ###, etc.)
   */
  private segmentBySection(text: string): TextSegment[] {
    const lines = text.split('\n');
    const segments: TextSegment[] = [];

    let currentSection: { title: string; content: string[]; startLine: number } | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

      if (headingMatch) {
        // Save previous section if exists
        if (currentSection && currentSection.content.length > 0) {
          const content = currentSection.content.join('\n').trim();
          if (content.length > 0) {
            segments.push({
              id: this.computeHash(content),
              content,
              startLine: currentSection.startLine,
              endLine: i - 1,
              type: 'section',
              title: currentSection.title,
            });
          }
        }

        // Start new section
        currentSection = {
          title: headingMatch[2].trim(),
          content: [],
          startLine: i,
        };
      } else if (currentSection) {
        currentSection.content.push(line);
      } else {
        // Content before first heading - create an intro section
        if (line.trim().length > 0) {
          if (!currentSection) {
            currentSection = {
              title: 'Introduction',
              content: [line],
              startLine: i,
            };
          }
        }
      }
    }

    // Don't forget last section
    if (currentSection && currentSection.content.length > 0) {
      const content = currentSection.content.join('\n').trim();
      if (content.length > 0) {
        segments.push({
          id: this.computeHash(content),
          content,
          startLine: currentSection.startLine,
          endLine: lines.length - 1,
          type: 'section',
          title: currentSection.title,
        });
      }
    }

    return segments;
  }

  /**
   * Segment by paragraphs (separated by blank lines)
   */
  private segmentByParagraph(text: string): TextSegment[] {
    const lines = text.split('\n');
    const segments: TextSegment[] = [];

    let currentParagraph: string[] = [];
    let startLine = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.trim() === '') {
        // End of paragraph
        if (currentParagraph.length > 0) {
          const content = currentParagraph.join('\n').trim();
          if (content.length > 0) {
            segments.push({
              id: this.computeHash(content),
              content,
              startLine,
              endLine: i - 1,
              type: 'paragraph',
            });
          }
          currentParagraph = [];
        }
        startLine = i + 1;
      } else {
        if (currentParagraph.length === 0) {
          startLine = i;
        }
        currentParagraph.push(line);
      }
    }

    // Don't forget last paragraph
    if (currentParagraph.length > 0) {
      const content = currentParagraph.join('\n').trim();
      if (content.length > 0) {
        segments.push({
          id: this.computeHash(content),
          content,
          startLine,
          endLine: lines.length - 1,
          type: 'paragraph',
        });
      }
    }

    return segments;
  }

  /**
   * Segment by sentences
   * Handles common abbreviations in French and English
   */
  private segmentBySentence(text: string): TextSegment[] {
    const segments: TextSegment[] = [];

    // Common abbreviations to not split on
    const abbreviations = [
      'M.',
      'Mme.',
      'Mlle.',
      'Dr.',
      'Pr.',
      'Prof.',
      'Mr.',
      'Mrs.',
      'Ms.',
      'Jr.',
      'Sr.',
      'vs.',
      'etc.',
      'cf.',
      'i.e.',
      'e.g.',
      'p.',
      'pp.',
      'vol.',
      'no.',
      'ed.',
      'eds.',
      'chap.',
      'fig.',
      'tab.',
      'op.',
      'cit.',
      'ibid.',
    ];

    // Replace abbreviations with placeholders
    let processedText = text;
    const placeholderMap: Map<string, string> = new Map();

    abbreviations.forEach((abbr, idx) => {
      const placeholder = `__ABBR_${idx}__`;
      const regex = new RegExp(abbr.replace('.', '\\.'), 'gi');
      processedText = processedText.replace(regex, (match) => {
        placeholderMap.set(placeholder, match);
        return placeholder;
      });
    });

    // Split on sentence-ending punctuation
    const sentencePattern = /[.!?]+[\s\n]+/g;
    const rawSentences = processedText.split(sentencePattern);

    // Track line numbers (approximate)
    const lines = text.split('\n');
    let currentLineIndex = 0;
    let charCount = 0;

    for (const sentence of rawSentences) {
      // Restore abbreviations
      let restoredSentence = sentence;
      placeholderMap.forEach((original, placeholder) => {
        restoredSentence = restoredSentence.replace(new RegExp(placeholder, 'g'), original);
      });

      const trimmed = restoredSentence.trim();
      if (trimmed.length > 0) {
        // Find approximate line number
        const startLine = currentLineIndex;
        let endLine = startLine;

        // Count how many lines this sentence spans
        const sentenceLines = trimmed.split('\n').length;
        endLine = Math.min(startLine + sentenceLines - 1, lines.length - 1);

        segments.push({
          id: this.computeHash(trimmed),
          content: trimmed,
          startLine,
          endLine,
          type: 'sentence',
        });

        // Update line tracking
        charCount += sentence.length;
        while (currentLineIndex < lines.length - 1) {
          const lineLength = lines[currentLineIndex].length + 1; // +1 for newline
          if (charCount <= lineLength) {
            break;
          }
          charCount -= lineLength;
          currentLineIndex++;
        }
      }
    }

    return segments;
  }

  /**
   * Find similar PDFs for a given segment
   */
  private async findSimilarPDFs(
    segment: TextSegment,
    options: SimilarityOptions
  ): Promise<PDFRecommendation[]> {
    // Skip very short segments (less than 20 characters)
    if (segment.content.trim().length < 20) {
      return [];
    }

    // Use the existing search functionality
    const searchResults = await pdfService.search(segment.content, {
      topK: options.maxResults * 2, // Get more results to filter by threshold
      collectionKeys: options.collectionFilter || undefined,
    });

    // Filter by similarity threshold and limit results
    const recommendations: PDFRecommendation[] = [];

    for (const result of searchResults) {
      if (result.similarity < options.similarityThreshold) {
        continue;
      }

      if (recommendations.length >= options.maxResults) {
        break;
      }

      // Skip if we already have a recommendation from this document
      if (recommendations.some((r) => r.pdfId === result.document?.id)) {
        continue;
      }

      if (result.document) {
        recommendations.push({
          pdfId: result.document.id,
          title: result.document.title || 'Sans titre',
          authors: result.document.author ? [result.document.author] : [],
          similarity: result.similarity,
          chunkPreview: result.chunk?.content?.substring(0, 200) || '',
          zoteroKey: result.document.bibtexKey,
          pageNumber: result.chunk?.pageNumber,
        });
      }
    }

    return recommendations;
  }

  // MARK: - Cache Management

  private getCachePath(projectPath: string): string {
    return path.join(projectPath, '.cliodeck', 'similarity_cache.json');
  }

  async loadCache(projectPath: string): Promise<SimilarityCache | null> {
    try {
      const cachePath = this.getCachePath(projectPath);
      if (!fs.existsSync(cachePath)) {
        return null;
      }

      const content = fs.readFileSync(cachePath, 'utf-8');
      const cache = JSON.parse(content) as SimilarityCache;

      console.log('💾 [SIMILARITY] Cache loaded', {
        segmentCount: Object.keys(cache.segments).length,
        createdAt: new Date(cache.createdAt).toISOString(),
      });

      return cache;
    } catch (error: any) {
      console.warn('⚠️  [SIMILARITY] Failed to load cache:', error.message);
      return null;
    }
  }

  async saveCache(projectPath: string, cache: SimilarityCache): Promise<void> {
    try {
      const cachePath = this.getCachePath(projectPath);
      const cacheDir = path.dirname(cachePath);

      if (!fs.existsSync(cacheDir)) {
        fs.mkdirSync(cacheDir, { recursive: true });
      }

      fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2), 'utf-8');
      console.log('💾 [SIMILARITY] Cache saved', {
        path: cachePath,
        segmentCount: Object.keys(cache.segments).length,
      });
    } catch (error: any) {
      console.error('❌ [SIMILARITY] Failed to save cache:', error.message);
    }
  }

  async clearCache(projectPath?: string): Promise<void> {
    const targetPath = projectPath || projectManager.getCurrentProjectPath();
    if (!targetPath) {
      return;
    }

    try {
      const cachePath = this.getCachePath(targetPath);
      if (fs.existsSync(cachePath)) {
        fs.unlinkSync(cachePath);
        console.log('🗑️  [SIMILARITY] Cache cleared');
      }
    } catch (error: any) {
      console.error('❌ [SIMILARITY] Failed to clear cache:', error.message);
    }
  }

  private isCacheValid(
    cache: SimilarityCache,
    documentHash: string,
    vectorStoreHash: string,
    options: SimilarityOptions
  ): boolean {
    // Check document and vector store haven't changed
    if (cache.documentHash !== documentHash || cache.vectorStoreHash !== vectorStoreHash) {
      console.log('💾 [SIMILARITY] Cache invalidated: content changed');
      return false;
    }

    // Check options match
    if (
      cache.options.granularity !== options.granularity ||
      cache.options.maxResults !== options.maxResults ||
      cache.options.similarityThreshold !== options.similarityThreshold
    ) {
      console.log('💾 [SIMILARITY] Cache invalidated: options changed');
      return false;
    }

    // Cache is valid for 24 hours
    const cacheAge = Date.now() - cache.createdAt;
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (cacheAge > maxAge) {
      console.log('💾 [SIMILARITY] Cache invalidated: too old');
      return false;
    }

    return true;
  }

  // MARK: - Hash Utilities

  private computeHash(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex').substring(0, 12);
  }

  private async computeVectorStoreHash(): Promise<string> {
    try {
      const stats = await pdfService.getStatistics();
      // Hash based on document count and last modification
      const hashInput = `${stats.documents}-${stats.chunks}`;
      return this.computeHash(hashInput);
    } catch {
      return 'unknown';
    }
  }

  /**
   * Get results for a specific segment from cache
   */
  async getResultsForSegment(segmentId: string): Promise<SimilarityResult | null> {
    const projectPath = projectManager.getCurrentProjectPath();
    if (!projectPath) {
      return null;
    }

    const cache = await this.loadCache(projectPath);
    if (!cache) {
      return null;
    }

    return cache.segments[segmentId] || null;
  }

  /**
   * Get all cached results
   */
  async getAllCachedResults(): Promise<SimilarityResult[]> {
    const projectPath = projectManager.getCurrentProjectPath();
    if (!projectPath) {
      return [];
    }

    const cache = await this.loadCache(projectPath);
    if (!cache) {
      return [];
    }

    return Object.values(cache.segments);
  }
}

// Export singleton
export const similarityService = new SimilarityService();
