import React from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { MarkdownEditor } from './MarkdownEditor';
import { MarkdownPreview } from './MarkdownPreview';
import { useEditorStore } from '../../stores/editorStore';
import { logger } from '../../utils/logger';
import './EditorPanel.css';

export const EditorPanel: React.FC = () => {
  const { showPreview, togglePreview, settings, loadFile, saveFile, setContent } = useEditorStore();

  const handleNewFile = () => {
    logger.component('EditorPanel', 'handleNewFile clicked');
    if (window.confirm('Créer un nouveau fichier ? Les modifications non sauvegardées seront perdues.')) {
      setContent('');
      logger.component('EditorPanel', 'New file created');
    }
  };

  const handleOpenFile = async () => {
    logger.component('EditorPanel', 'handleOpenFile clicked');
    try {
      const result = await window.electron.dialog.openFile({
        properties: ['openFile'],
        filters: [
          { name: 'Markdown', extensions: ['md', 'markdown'] },
          { name: 'Tous les fichiers', extensions: ['*'] },
        ],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        logger.component('EditorPanel', 'Loading file', { path: result.filePaths[0] });
        await loadFile(result.filePaths[0]);
        logger.component('EditorPanel', 'File loaded successfully');
      }
    } catch (error) {
      logger.error('EditorPanel', error);
      alert('Erreur lors de l\'ouverture du fichier');
    }
  };

  const handleSaveFile = async () => {
    logger.component('EditorPanel', 'handleSaveFile clicked');
    try {
      await saveFile();
      logger.component('EditorPanel', 'File saved successfully');
    } catch (error: any) {
      // If no file path, show save dialog
      if (error.message.includes('No file path')) {
        logger.component('EditorPanel', 'No file path, showing save dialog');
        const result = await window.electron.dialog.saveFile({
          filters: [
            { name: 'Markdown', extensions: ['md'] },
            { name: 'Tous les fichiers', extensions: ['*'] },
          ],
        });

        if (!result.canceled && result.filePath) {
          logger.component('EditorPanel', 'Saving file as', { path: result.filePath });
          await useEditorStore.getState().saveFileAs(result.filePath);
          logger.component('EditorPanel', 'File saved successfully');
        }
      } else {
        logger.error('EditorPanel', error);
        alert('Erreur lors de la sauvegarde du fichier');
      }
    }
  };

  const handleBold = () => {
    logger.component('EditorPanel', 'handleBold clicked');
    useEditorStore.getState().insertText('**texte en gras**');
  };

  const handleItalic = () => {
    logger.component('EditorPanel', 'handleItalic clicked');
    useEditorStore.getState().insertText('*texte en italique*');
  };

  const handleLink = () => {
    logger.component('EditorPanel', 'handleLink clicked');
    useEditorStore.getState().insertText('[texte du lien](url)');
  };

  const handleCitation = () => {
    logger.component('EditorPanel', 'handleCitation clicked');
    useEditorStore.getState().insertText('[@citationKey]');
  };

  return (
    <div className="editor-panel">
      {/* Toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-section">
          <button className="toolbar-btn" onClick={handleNewFile} title="Nouveau fichier">
            📄
          </button>
          <button className="toolbar-btn" onClick={handleOpenFile} title="Ouvrir">
            📂
          </button>
          <button className="toolbar-btn" onClick={handleSaveFile} title="Enregistrer">
            💾
          </button>
        </div>

        <div className="toolbar-section">
          <button className="toolbar-btn" onClick={handleBold} title="Gras">
            <strong>B</strong>
          </button>
          <button className="toolbar-btn" onClick={handleItalic} title="Italique">
            <em>I</em>
          </button>
          <button className="toolbar-btn" onClick={handleLink} title="Lien">
            🔗
          </button>
          <button className="toolbar-btn" onClick={handleCitation} title="Citation">
            📚
          </button>
        </div>

        <div className="toolbar-section">
          <button
            className={`toolbar-btn ${showPreview ? 'active' : ''}`}
            onClick={togglePreview}
            title="Afficher/Masquer l'aperçu"
          >
            👁️
          </button>
        </div>
      </div>

      {/* Editor + Preview */}
      <div className="editor-content">
        {showPreview ? (
          <PanelGroup direction="horizontal">
            <Panel defaultSize={50} minSize={30}>
              <MarkdownEditor />
            </Panel>

            <PanelResizeHandle className="editor-resize-handle" />

            <Panel defaultSize={50} minSize={30}>
              <MarkdownPreview />
            </Panel>
          </PanelGroup>
        ) : (
          <MarkdownEditor />
        )}
      </div>
    </div>
  );
};
