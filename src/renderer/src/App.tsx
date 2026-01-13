import React, { useEffect } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { MainLayout } from './components/Layout/MainLayout';
import { EditorPanel } from './components/Editor/EditorPanel';
import { RebuildProgressModal } from './components/Project/RebuildProgressModal';
import { ErrorFallback } from './components/ErrorFallback';
import { useMenuShortcuts } from './hooks/useMenuShortcuts';
import { useLanguageStore } from './stores/languageStore';
import { useProjectStore } from './stores/projectStore';

function App() {
  // Setup menu shortcuts listeners
  useMenuShortcuts();

  // Initialiser la langue
  const initializeLanguage = useLanguageStore((state) => state.initializeLanguage);
  const loadProject = useProjectStore((state) => state.loadProject);

  useEffect(() => {
    initializeLanguage();

    // Note: Chargement automatique désactivé car peut causer des erreurs au démarrage
    // L'utilisateur doit ouvrir manuellement le projet via File > Open Project
    // ou cliquer sur un projet récent dans le panneau projet

    // Si vous voulez réactiver le chargement automatique, décommentez ci-dessous:
    /*
    const loadLastProject = async () => {
      try {
        const recentProjects = await window.electron.project.getRecent();
        if (recentProjects && recentProjects.length > 0) {
          console.log('🔄 Auto-loading last project:', recentProjects[0]);
          await loadProject(recentProjects[0]);
        }
      } catch (error) {
        console.error('Failed to auto-load last project:', error);
      }
    };

    loadLastProject();
    */
  }, [initializeLanguage, loadProject]);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset app state if needed
        window.location.reload();
      }}
      onError={(error, errorInfo) => {
        // Log error to console
        console.error('Error caught by boundary:', error, errorInfo);
        // TODO: Send to error tracking service (Sentry, etc.)
      }}
    >
      <MainLayout centerPanel={<EditorPanel />} />
      <RebuildProgressModal />
    </ErrorBoundary>
  );
}

export default App;
