import React, { useState } from 'react';
import { useBibliographyStore } from '../../stores/bibliographyStore';
import { CitationList } from './CitationList';
import { CitationCard } from './CitationCard';
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
      const filePath = await window.electron.dialog.openFile({
        filters: [{ name: 'BibTeX', extensions: ['bib'] }],
      });

      if (filePath) {
        await useBibliographyStore.getState().loadBibliography(filePath);
      }
    } catch (error) {
      console.error('Failed to import BibTeX:', error);
    }
  };

  return (
    <div className="bibliography-panel">
      {/* Header */}
      <div className="bibliography-header">
        <div className="header-title">
          <span className="header-icon">📚</span>
          <h3>Bibliographie</h3>
        </div>
        <button className="import-btn" onClick={handleImportBibTeX} title="Importer BibTeX">
          ➕
        </button>
      </div>

      {/* Search & Filters */}
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

      {/* Citation List */}
      <div className="bibliography-content">
        {filteredCitations.length === 0 ? (
          <div className="bibliography-empty">
            <div className="empty-icon">📖</div>
            <h4>Aucune citation</h4>
            <p>Importez un fichier BibTeX pour commencer</p>
          </div>
        ) : (
          <CitationList citations={filteredCitations} />
        )}
      </div>
    </div>
  );
};
