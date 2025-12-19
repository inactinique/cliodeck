import React from 'react';
import { MainLayout } from './components/Layout/MainLayout';
import { EditorPanel } from './components/Editor/EditorPanel';

function App() {
  return (
    <MainLayout
      leftPanel={
        <div style={{ padding: '16px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#cccccc' }}>
            Projets récents
          </h3>
          <p style={{ color: '#888', fontSize: '13px' }}>Aucun projet</p>
        </div>
      }
      centerPanel={<EditorPanel />}
    />
  );
}

export default App;
