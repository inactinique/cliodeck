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

interface BibliographyState {
  // Citations
  citations: Citation[];
  filteredCitations: Citation[];
  selectedCitationId: string | null;

  // Search & filters
  searchQuery: string;
  sortBy: 'author' | 'year' | 'title';
  sortOrder: 'asc' | 'desc';

  // Actions
  loadBibliography: (filePath: string) => Promise<void>;
  searchCitations: (query: string) => void;
  setSortBy: (field: 'author' | 'year' | 'title') => void;
  toggleSortOrder: () => void;

  selectCitation: (citationId: string) => void;
  insertCitation: (citationId: string) => void;

  indexPDFFromCitation: (citationId: string) => Promise<void>;

  // Internal
  applyFilters: () => void;
}

// MARK: - Store

export const useBibliographyStore = create<BibliographyState>((set, get) => ({
  citations: [],
  filteredCitations: [],
  selectedCitationId: null,
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
      const { citations } = get();
      const citation = citations.find((c) => c.id === citationId);

      if (!citation || !citation.file) {
        throw new Error('No PDF file associated with this citation');
      }

      console.log(`🔍 Indexing PDF for citation: ${citation.title}`);
      console.log(`📁 PDF file path: ${citation.file}`);

      const result = await window.electron.pdf.index(citation.file, citationId);

      if (!result.success) {
        throw new Error(result.error || 'Failed to index PDF');
      }

      console.log(`✅ PDF indexed from citation: ${citation.title}`);
    } catch (error) {
      console.error('❌ Failed to index PDF from citation:', error);
      throw error;
    }
  },
}));
