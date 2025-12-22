import React, { useState, useEffect } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { useBibliographyStore } from '../../stores/bibliographyStore';
import { useProjectStore } from '../../stores/projectStore';

interface ZoteroCollection {
  key: string;
  name: string;
  parentCollection?: string;
}

export const ZoteroImport: React.FC = () => {
  const currentProject = useProjectStore((state) => state.currentProject);
  const [userId, setUserId] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [collections, setCollections] = useState<ZoteroCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Calculate depth of a collection in hierarchy
  const getCollectionDepth = (collectionKey: string): number => {
    const col = collections.find((c) => c.key === collectionKey);
    if (!col || !col.parentCollection) return 0;
    return 1 + getCollectionDepth(col.parentCollection);
  };

  // Load config on mount
  useEffect(() => {
    loadZoteroConfig();
  }, []);

  const loadZoteroConfig = async () => {
    try {
      const config = await window.electron.config.get('zotero');
      if (config) {
        setUserId(config.userId || '');
        setApiKey(config.apiKey || '');
      }
    } catch (error) {
      console.error('Failed to load Zotero config:', error);
    }
  };

  const handleLoadCollections = async () => {
    if (!userId || !apiKey) {
      alert('Veuillez configurer Zotero dans les paramètres d\'abord');
      return;
    }

    setIsLoadingCollections(true);

    try {
      const result = await window.electron.zotero.listCollections(userId, apiKey);
      if (result.success && result.collections) {
        setCollections(result.collections);
      } else {
        alert('Erreur lors du chargement des collections');
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
      alert('Erreur lors du chargement des collections');
    } finally {
      setIsLoadingCollections(false);
    }
  };

  const handleImport = async () => {
    if (!userId || !apiKey) {
      alert('Veuillez configurer Zotero dans les paramètres');
      return;
    }

    setIsImporting(true);

    try {
      // Determine target directory based on current project
      let targetDirectory: string | undefined;
      let projectJsonPath: string | undefined;

      if (currentProject) {
        // currentProject.path is always the folder path for all project types
        targetDirectory = currentProject.path;

        // For non-notes projects, the project.json is at path/project.json
        if (currentProject.type !== 'notes') {
          projectJsonPath = `${currentProject.path}/project.json`;
        }
      }

      console.log('🔍 Zotero import - Project paths:', {
        currentProjectPath: currentProject?.path,
        targetDirectory,
        projectJsonPath
      });

      // Sync to get BibTeX
      const syncResult = await window.electron.zotero.sync({
        userId,
        apiKey,
        collectionKey: selectedCollection || undefined,
        downloadPDFs: false,
        exportBibTeX: true,
        targetDirectory,
      });

      if (syncResult.success && syncResult.bibtexPath) {
        // Load the exported BibTeX into bibliography
        await useBibliographyStore.getState().loadBibliography(syncResult.bibtexPath);

        // Get the actual count of loaded citations
        const citationCount = useBibliographyStore.getState().citations.length;

        // If we have a project (non-notes), save the bibliography source configuration
        if (projectJsonPath && currentProject?.type !== 'notes') {
          // Get just the filename for relative path
          const bibFileName = syncResult.bibtexPath.split('/').pop() || 'bibliography.bib';

          await window.electron.project.setBibliographySource({
            projectPath: projectJsonPath,
            type: 'zotero',
            filePath: bibFileName,
            zoteroCollection: selectedCollection || undefined,
          });

          console.log('✅ Bibliography source saved to project');
        }

        alert(`✅ Import réussi!\n\n${citationCount} références importées`);

        // Reset selection
        setSelectedCollection('');
      } else {
        alert(`❌ Erreur: ${syncResult.error}`);
      }
    } catch (error) {
      console.error('Import failed:', error);
      alert('Erreur lors de l\'import');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="zotero-import">
      <div className="zotero-import-header">
        <h4>Import depuis Zotero</h4>
        {(!userId || !apiKey) && (
          <p className="zotero-warning">
            ⚠️ Configurez vos identifiants Zotero dans les paramètres
          </p>
        )}
        {!currentProject && (
          <p className="zotero-info">
            💡 Ouvrez un projet pour que la bibliographie soit automatiquement sauvegardée avec le projet
          </p>
        )}
      </div>

      <div className="zotero-import-controls">
        <div className="zotero-collection-selector">
          <select
            value={selectedCollection}
            onChange={(e) => setSelectedCollection(e.target.value)}
            disabled={!userId || !apiKey || collections.length === 0}
            className="zotero-select"
          >
            <option value="">
              {collections.length === 0 ? 'Charger les collections...' : 'Toutes les collections'}
            </option>
            {collections.map((col) => {
              const depth = getCollectionDepth(col.key);
              const indent = '\u00A0\u00A0\u00A0'.repeat(depth); // Non-breaking spaces for indentation
              const prefix = depth > 0 ? '└─ ' : '';
              return (
                <option key={col.key} value={col.key}>
                  {indent}{prefix}{col.name}
                </option>
              );
            })}
          </select>

          <button
            className="toolbar-btn"
            onClick={handleLoadCollections}
            disabled={!userId || !apiKey || isLoadingCollections}
            title="Charger les collections"
          >
            <RefreshCw size={16} className={isLoadingCollections ? 'spinning' : ''} />
          </button>
        </div>

        <button
          className="zotero-import-btn"
          onClick={handleImport}
          disabled={!userId || !apiKey || isImporting}
        >
          <Download size={16} />
          {isImporting ? 'Import en cours...' : 'Importer'}
        </button>
      </div>
    </div>
  );
};
