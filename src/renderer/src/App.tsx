import React, { useEffect } from 'react';
import { MainLayout } from './components/Layout/MainLayout';
import { EditorPanel } from './components/Editor/EditorPanel';
import { useMenuShortcuts } from './hooks/useMenuShortcuts';
import { useLanguageStore } from './stores/languageStore';

function App() {
  // Setup menu shortcuts listeners
  useMenuShortcuts();

  // Initialiser la langue
  const initializeLanguage = useLanguageStore((state) => state.initializeLanguage);

  useEffect(() => {
    initializeLanguage();
  }, [initializeLanguage]);

  return (
    <MainLayout
      centerPanel={<EditorPanel />}
    />
  );
}

export default App;
