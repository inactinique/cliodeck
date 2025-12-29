import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { useBibliographyStore } from '../../stores/bibliographyStore';
import { useProjectStore } from '../../stores/projectStore';
import { CitationList } from './CitationList';
import { CitationCard } from './CitationCard';
import { CollapsibleSection } from '../common/CollapsibleSection';
import { ZoteroImport } from './ZoteroImport';
import './BibliographyPanel.css';

export const BibliographyPanel: React.FC = () => {
  const { t } = useTranslation('common');
  const currentProject = useProjectStore((state) => state.currentProject);
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
        const sourcePath = result.filePaths[0];

        // Load the bibliography into memory
        await useBibliographyStore.getState().loadBibliography(sourcePath);

        // If we have a project (non-notes), save the bibliography source configuration
        if (currentProject && currentProject.type !== 'notes') {
          // Copy the .bib file to the project directory
          const bibFileName = sourcePath.split('/').pop() || 'bibliography.bib';
          const targetPath = `${currentProject.path}/${bibFileName}`;

          // Copy file to project directory
          await window.electron.fs.copyFile(sourcePath, targetPath);

          // Save the bibliography source to project.json
          const projectJsonPath = `${currentProject.path}/project.json`;
          await window.electron.project.setBibliographySource({
            projectPath: projectJsonPath,
            type: 'file',
            filePath: bibFileName,
          });

          console.log('✅ Bibliography source saved to project');
        }
      }
    } catch (error) {
      console.error('Failed to import BibTeX:', error);
    }
  };

  return (
    <div className="bibliography-panel">
      {/* Header */}
      <div className="bibliography-header">
        <button className="toolbar-btn" onClick={handleImportBibTeX} title={t('bibliography.import')}>
          <Plus size={20} strokeWidth={1} />
        </button>
      </div>

      {/* Zotero Import */}
      <ZoteroImport />

      {/* Search & Filters */}
      <CollapsibleSection title={t('bibliography.searchAndFilters')} defaultExpanded={true}>
        <div className="bibliography-controls">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder={t('bibliography.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => searchCitations(e.target.value)}
            />
          </div>

          <div className="sort-controls">
            <label className="sort-label">{t('bibliography.sortBy')}</label>
            <select
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'author' | 'year' | 'title')}
            >
              <option value="author">{t('bibliography.author')}</option>
              <option value="year">{t('bibliography.year')}</option>
              <option value="title">{t('bibliography.titleField')}</option>
            </select>
            <button className="sort-order-btn" onClick={toggleSortOrder} title={t('bibliography.sortBy')}>
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
      <CollapsibleSection title={t('bibliography.title')} defaultExpanded={true}>
        <div className="bibliography-content">
          {filteredCitations.length === 0 ? (
            <div className="bibliography-empty">
              <h4>{t('bibliography.noCitations')}</h4>
              <p>{t('bibliography.importPrompt')}</p>
            </div>
          ) : (
            <CitationList citations={filteredCitations} />
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
};
