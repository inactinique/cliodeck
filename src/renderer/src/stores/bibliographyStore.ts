import { create } from 'zustand';

// MARK: - Types

export interface Citation {
  id: string;
  type: string;
  author: string;
  year: string;
  title: string;
  shortTitle?: string;
  journal?: string;
  publisher?: string;
  booktitle?: string;
  file?: string;
}

export interface IndexingProgress {
  citationId: string;
  title: string;
  progress: number;
  stage: string;
}

export interface BatchIndexingState {
  isIndexing: boolean;
  current: number;
  total: number;
  currentCitation?: IndexingProgress;
  skipped: number;
  indexed: number;
  errors: string[];
}

interface BibliographyState {
  // Citations
  citations: Citation[];
  filteredCitations: Citation[];
  selectedCitationId: string | null;

  // Indexed PDFs tracking
  indexedFilePaths: Set<string>;

  // Batch indexing state
  batchIndexing: BatchIndexingState;

  // Search & filters
  searchQuery: string;
  sortBy: 'author' | 'year' | 'title';
  sortOrder: 'asc' | 'desc';

  // Actions
  loadBibliography: (filePath: string) => Promise<void>;
  mergeBibliography: (filePath: string) => Promise<{ newCitations: number; duplicates: number; total: number }>;
  searchCitations: (query: string) => void;
  setSortBy: (field: 'author' | 'year' | 'title') => void;
  toggleSortOrder: () => void;

  selectCitation: (citationId: string) => void;
  insertCitation: (citationId: string) => void;

  indexPDFFromCitation: (citationId: string) => Promise<{ alreadyIndexed: boolean }>;
  indexAllPDFs: () => Promise<{ indexed: number; skipped: number; errors: string[] }>;
  refreshIndexedPDFs: () => Promise<void>;
  isFileIndexed: (filePath: string) => boolean;

  // Internal
  applyFilters: () => void;
}

// MARK: - Store

export const useBibliographyStore = create<BibliographyState>((set, get) => ({
  citations: [],
  filteredCitations: [],
  selectedCitationId: null,
  indexedFilePaths: new Set<string>(),
  batchIndexing: {
    isIndexing: false,
    current: 0,
    total: 0,
    skipped: 0,
    indexed: 0,
    errors: [],
  },
  searchQuery: '',
  sortBy: 'author',
  sortOrder: 'asc',

  loadBibliography: async (filePath: string) => {
    try {
      const result = await window.electron.bibliography.load(filePath);

      if (result.success && Array.isArray(result.citations)) {
        set({
          citations: result.citations,
          filteredCitations: result.citations,
        });

        get().applyFilters();
      } else {
        console.error('Invalid response from bibliography.load:', result);
        throw new Error(result.error || 'Failed to load bibliography');
      }
    } catch (error) {
      console.error('Failed to load bibliography:', error);
      throw error;
    }
  },

  mergeBibliography: async (filePath: string) => {
    try {
      const result = await window.electron.bibliography.load(filePath);

      if (!result.success || !Array.isArray(result.citations)) {
        console.error('Invalid response from bibliography.load:', result);
        throw new Error(result.error || 'Failed to load bibliography');
      }

      const { citations: currentCitations } = get();
      const newCitationsFromFile = result.citations;

      // Build a Set of existing citation IDs for fast lookup
      const existingIds = new Set(currentCitations.map(c => c.id));

      // Separate new citations from duplicates
      const newCitations: Citation[] = [];
      let duplicatesCount = 0;

      newCitationsFromFile.forEach((citation: Citation) => {
        if (existingIds.has(citation.id)) {
          duplicatesCount++;
          console.log(`🔄 Duplicate found: ${citation.id} - ${citation.title}`);
        } else {
          newCitations.push(citation);
        }
      });

      // Merge: existing + new (no duplicates)
      const mergedCitations = [...currentCitations, ...newCitations];

      console.log(`✅ Bibliography merge complete:`, {
        existing: currentCitations.length,
        fromFile: newCitationsFromFile.length,
        newAdded: newCitations.length,
        duplicates: duplicatesCount,
        total: mergedCitations.length,
      });

      set({
        citations: mergedCitations,
        filteredCitations: mergedCitations,
      });

      get().applyFilters();

      return {
        newCitations: newCitations.length,
        duplicates: duplicatesCount,
        total: mergedCitations.length,
      };
    } catch (error) {
      console.error('Failed to merge bibliography:', error);
      throw error;
    }
  },

  searchCitations: (query: string) => {
    set({ searchQuery: query });
    get().applyFilters();
  },

  setSortBy: (field: 'author' | 'year' | 'title') => {
    set({ sortBy: field });
    get().applyFilters();
  },

  toggleSortOrder: () => {
    set((state) => ({
      sortOrder: state.sortOrder === 'asc' ? 'desc' : 'asc',
    }));
    get().applyFilters();
  },

  applyFilters: () => {
    const { citations, searchQuery, sortBy, sortOrder } = get();

    // Filter by search query
    let filtered = citations;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = citations.filter(
        (citation) =>
          citation.author.toLowerCase().includes(query) ||
          citation.title.toLowerCase().includes(query) ||
          citation.year.includes(query)
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'author':
          comparison = a.author.localeCompare(b.author);
          break;
        case 'year':
          comparison = a.year.localeCompare(b.year);
          break;
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    set({ filteredCitations: filtered });
  },

  selectCitation: (citationId: string) => {
    set({ selectedCitationId: citationId });
  },

  insertCitation: (citationId: string) => {
    const { citations } = get();
    const citation = citations.find((c) => c.id === citationId);

    if (!citation) return;

    // Use the actual BibTeX key from the citation id
    const citationText = `[@${citation.id}]`;

    console.log('📝 Inserting citation:', citationText, 'for', citation.title);

    // Call IPC to insert citation into editor
    window.electron.editor.insertText(citationText);
  },

  indexPDFFromCitation: async (citationId: string) => {
    try {
      const { citations, indexedFilePaths } = get();
      const citation = citations.find((c) => c.id === citationId);

      if (!citation || !citation.file) {
        throw new Error('No PDF file associated with this citation');
      }

      // Check if already indexed
      if (indexedFilePaths.has(citation.file)) {
        console.log(`⏭️ PDF already indexed: ${citation.title}`);
        return { alreadyIndexed: true };
      }

      console.log(`🔍 Indexing PDF for citation: ${citation.title}`);
      console.log(`📁 PDF file path: ${citation.file}`);

      // Emit event to show progress in PDF panel
      window.dispatchEvent(new CustomEvent('bibliography:indexing-start', {
        detail: { citationId, title: citation.title, filePath: citation.file }
      }));

      const result = await window.electron.pdf.index(citation.file, citationId);

      if (!result.success) {
        window.dispatchEvent(new CustomEvent('bibliography:indexing-end', {
          detail: { citationId, success: false, error: result.error }
        }));
        throw new Error(result.error || 'Failed to index PDF');
      }

      // Add to indexed set
      set((state) => ({
        indexedFilePaths: new Set([...state.indexedFilePaths, citation.file!])
      }));

      window.dispatchEvent(new CustomEvent('bibliography:indexing-end', {
        detail: { citationId, success: true }
      }));

      console.log(`✅ PDF indexed from citation: ${citation.title}`);
      return { alreadyIndexed: false };
    } catch (error) {
      console.error('❌ Failed to index PDF from citation:', error);
      throw error;
    }
  },

  indexAllPDFs: async () => {
    const { citations } = get();

    // Refresh indexed PDFs list first
    await get().refreshIndexedPDFs();

    // Get citations with PDFs that are not yet indexed
    const citationsWithPDFs = citations.filter(
      (c) => c.file && !get().indexedFilePaths.has(c.file)
    );

    if (citationsWithPDFs.length === 0) {
      return { indexed: 0, skipped: 0, errors: [] };
    }

    const errors: string[] = [];
    let indexed = 0;
    let skipped = 0;

    set({
      batchIndexing: {
        isIndexing: true,
        current: 0,
        total: citationsWithPDFs.length,
        skipped: 0,
        indexed: 0,
        errors: [],
      }
    });

    for (let i = 0; i < citationsWithPDFs.length; i++) {
      const citation = citationsWithPDFs[i];

      set((state) => ({
        batchIndexing: {
          ...state.batchIndexing,
          current: i + 1,
          currentCitation: {
            citationId: citation.id,
            title: citation.title,
            progress: 0,
            stage: 'Initialisation...',
          }
        }
      }));

      try {
        // Check again in case it was indexed during batch
        if (get().indexedFilePaths.has(citation.file!)) {
          skipped++;
          set((state) => ({
            batchIndexing: { ...state.batchIndexing, skipped }
          }));
          continue;
        }

        window.dispatchEvent(new CustomEvent('bibliography:indexing-start', {
          detail: { citationId: citation.id, title: citation.title, filePath: citation.file }
        }));

        const result = await window.electron.pdf.index(citation.file!, citation.id);

        if (result.success) {
          indexed++;
          set((state) => ({
            indexedFilePaths: new Set([...state.indexedFilePaths, citation.file!]),
            batchIndexing: { ...state.batchIndexing, indexed }
          }));
        } else {
          errors.push(`${citation.title}: ${result.error}`);
        }

        window.dispatchEvent(new CustomEvent('bibliography:indexing-end', {
          detail: { citationId: citation.id, success: result.success, error: result.error }
        }));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(`${citation.title}: ${errorMsg}`);
        window.dispatchEvent(new CustomEvent('bibliography:indexing-end', {
          detail: { citationId: citation.id, success: false, error: errorMsg }
        }));
      }
    }

    set({
      batchIndexing: {
        isIndexing: false,
        current: citationsWithPDFs.length,
        total: citationsWithPDFs.length,
        skipped,
        indexed,
        errors,
      }
    });

    return { indexed, skipped, errors };
  },

  refreshIndexedPDFs: async () => {
    try {
      const result = await window.electron.pdf.getAll();
      if (result.success && Array.isArray(result.documents)) {
        // Extract file paths from indexed documents
        // Documents store the original file path or we can match by bibtexKey
        const indexedPaths = new Set<string>();

        // Also get bibtex keys to match with citations
        const indexedBibtexKeys = new Set<string>();
        result.documents.forEach((doc: any) => {
          if (doc.filePath) {
            indexedPaths.add(doc.filePath);
          }
          if (doc.bibtexKey) {
            indexedBibtexKeys.add(doc.bibtexKey);
          }
        });

        // Match citations by bibtexKey and add their file paths
        const { citations } = get();
        citations.forEach((citation) => {
          if (citation.file && indexedBibtexKeys.has(citation.id)) {
            indexedPaths.add(citation.file);
          }
        });

        set({ indexedFilePaths: indexedPaths });
        console.log(`📚 Refreshed indexed PDFs: ${indexedPaths.size} files`);
      }
    } catch (error) {
      console.error('Failed to refresh indexed PDFs:', error);
    }
  },

  isFileIndexed: (filePath: string) => {
    return get().indexedFilePaths.has(filePath);
  },
}));
