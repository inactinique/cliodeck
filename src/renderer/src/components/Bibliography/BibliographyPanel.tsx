import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useBibliographyStore } from '../../stores/bibliographyStore';
import { CitationList } from './CitationList';
import { CitationCard } from './CitationCard';
import { CollapsibleSection } from '../common/CollapsibleSection';
import { ZoteroImport } from './ZoteroImport';
import './BibliographyPanel.css';

export const BibliographyPanel: React.FC = () => {
  const {
    filteredCitations,
    searchQuery,
    searchCitations,
    sortBy,
    setSortBy,
    toggleSortOrder,
    sortOrder,
  } = useBibliographyStore();

  const [showImportDialog, setShowImportDialog] = useState(false);

  const handleImportBibTeX = async () => {
    try {
      const result = await window.electron.dialog.openFile({
        filters: [{ name: 'BibTeX', extensions: ['bib'] }],
      });

      if (!result.canceled && result.filePaths && result.filePaths.length > 0) {
        await useBibliographyStore.getState().loadBibliography(result.filePaths[0]);
      }
    } catch (error) {
      console.error('Failed to import BibTeX:', error);
    }
  };

  return (
    <div className="bibliography-panel">
      {/* Header */}
      <div className="bibliography-header">
        <button className="toolbar-btn" onClick={handleImportBibTeX} title="Importer fichier BibTeX">
          <Plus size={20} strokeWidth={1} />
        </button>
      </div>

      {/* Zotero Import */}
      <ZoteroImport />

      {/* Search & Filters */}
      <CollapsibleSection title="Recherche et filtres" defaultExpanded={true}>
        <div className="bibliography-controls">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Rechercher auteur, titre, année..."
              value={searchQuery}
              onChange={(e) => searchCitations(e.target.value)}
            />
          </div>

          <div className="sort-controls">
            <label className="sort-label">Trier par:</label>
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'author' | 'year' | 'title')}
            >
              <option value="author">Auteur</option>
              <option value="year">Année</option>
              <option value="title">Titre</option>
            </select>
            <button className="sort-order-btn" onClick={toggleSortOrder} title="Ordre de tri">
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Citation Count */}
        <div className="citation-count">
          {filteredCitations.length} citation{filteredCitations.length !== 1 ? 's' : ''}
        </div>
      </CollapsibleSection>

      {/* Citation List */}
      <CollapsibleSection title="Citations" defaultExpanded={true}>
        <div className="bibliography-content">
          {filteredCitations.length === 0 ? (
            <div className="bibliography-empty">
              <h4>Aucune citation</h4>
              <p>Importez un fichier BibTeX pour commencer</p>
            </div>
          ) : (
            <CitationList citations={filteredCitations} />
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
};
