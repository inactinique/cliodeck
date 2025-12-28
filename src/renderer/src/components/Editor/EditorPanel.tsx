import React from 'react';
import { FileText, FolderOpen, Save, Link, BookOpen, Table, Superscript, Quote, BarChart3, CheckCircle } from 'lucide-react';
// import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { MarkdownEditor } from './MarkdownEditor';
// import { MarkdownPreview } from './MarkdownPreview';
// import { DocumentStats } from './DocumentStats';
// import { ContextualSuggestions } from './ContextualSuggestions';
import { useEditorStore } from '../../stores/editorStore';
import { useBibliographyStore } from '../../stores/bibliographyStore';
import { logger } from '../../utils/logger';
import './EditorPanel.css';

export const EditorPanel: React.FC = () => {
  const { showStats, toggleStats, loadFile, saveFile, setContent, content, insertFormatting } = useEditorStore();
  const { citations } = useBibliographyStore();

  // Suggestions config - temporarily disabled
  // const [suggestionsConfig, setSuggestionsConfig] = useState({
  //   enableCitationSuggestions: true,
  //   citationSuggestionDelay: 500,
  //   maxCitationSuggestions: 5,
  //   enableReformulationSuggestions: false,
  //   reformulationDelay: 2000,
  //   reformulationMinWords: 10,
  //   showSuggestionsInline: true,
  // });

  // Load suggestions config on mount
  // useEffect(() => {
  //   const loadSuggestionsConfig = async () => {
  //     try {
  //       const config = await window.electron.config.get('suggestions');
  //       if (config) {
  //         setSuggestionsConfig(config);
  //       }
  //     } catch (error) {
  //       console.error('Failed to load suggestions config:', error);
  //     }
  //   };
  //   loadSuggestionsConfig();
  // }, []);

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
    insertFormatting('bold');
  };

  const handleItalic = () => {
    logger.component('EditorPanel', 'handleItalic clicked');
    insertFormatting('italic');
  };

  const handleLink = () => {
    logger.component('EditorPanel', 'handleLink clicked');
    insertFormatting('link');
  };

  const handleCitation = () => {
    logger.component('EditorPanel', 'handleCitation clicked');
    insertFormatting('citation');
  };

  const handleTable = () => {
    logger.component('EditorPanel', 'handleTable clicked');
    insertFormatting('table');
  };

  const handleFootnote = () => {
    logger.component('EditorPanel', 'handleFootnote clicked');
    insertFormatting('footnote');
  };

  const handleBlockQuote = () => {
    logger.component('EditorPanel', 'handleBlockQuote clicked');
    insertFormatting('blockquote');
  };

  const handleToggleStats = () => {
    logger.component('EditorPanel', 'handleToggleStats clicked');
    toggleStats();
  };

  const handleCheckCitations = () => {
    logger.component('EditorPanel', 'handleCheckCitations clicked');
    // Extract all citations from content
    const citationMatches = content.match(/\[@([^\]]+)\]/g) || [];
    const citedKeys = citationMatches.map(match => match.replace(/\[@|]/g, ''));

    // Get all available citation keys
    const availableKeys = citations.map(c => c.id);

    // Find missing citations
    const missingCitations = citedKeys.filter(key => !availableKeys.includes(key));
    const duplicateCitations = citedKeys.filter((key, index) => citedKeys.indexOf(key) !== index);

    if (missingCitations.length === 0 && duplicateCitations.length === 0) {
      alert('✅ Toutes les citations sont valides !');
    } else {
      let message = '';
      if (missingCitations.length > 0) {
        message += `❌ Citations manquantes dans la bibliographie:\n${missingCitations.join(', ')}\n\n`;
      }
      if (duplicateCitations.length > 0) {
        message += `⚠️ Citations en double:\n${[...new Set(duplicateCitations)].join(', ')}`;
      }
      alert(message);
    }
  };

  return (
    <div className="editor-panel">
      {/* Toolbar */}
      <div className="editor-toolbar">
        <div className="toolbar-section">
          <button className="toolbar-btn" onClick={handleNewFile} title="Nouveau fichier">
            <FileText size={20} strokeWidth={1} />
          </button>
          <button className="toolbar-btn" onClick={handleOpenFile} title="Ouvrir">
            <FolderOpen size={20} strokeWidth={1} />
          </button>
          <button className="toolbar-btn" onClick={handleSaveFile} title="Enregistrer">
            <Save size={20} strokeWidth={1} />
          </button>
        </div>

        <div className="toolbar-section">
          <button className="toolbar-btn" onClick={handleBold} title="Gras (Ctrl+B)">
            <strong>B</strong>
          </button>
          <button className="toolbar-btn" onClick={handleItalic} title="Italique (Ctrl+I)">
            <em>I</em>
          </button>
          <button className="toolbar-btn" onClick={handleLink} title="Lien (Ctrl+L)">
            <Link size={20} strokeWidth={1} />
          </button>
          <button className="toolbar-btn" onClick={handleCitation} title="Citation (Ctrl+')">
            <BookOpen size={20} strokeWidth={1} />
          </button>
          <button className="toolbar-btn" onClick={handleTable} title="Insérer un tableau (Ctrl+Shift+T)">
            <Table size={20} strokeWidth={1} />
          </button>
        </div>

        <div className="toolbar-section">
          <button className="toolbar-btn" onClick={handleFootnote} title="Note de bas de page (Ctrl+Shift+F)">
            <Superscript size={20} strokeWidth={1} />
          </button>
          <button className="toolbar-btn" onClick={handleBlockQuote} title="Bloc citation">
            <Quote size={20} strokeWidth={1} />
          </button>
        </div>

        <div className="toolbar-section">
          <button
            className={`toolbar-btn ${showStats ? 'active' : ''}`}
            onClick={handleToggleStats}
            title="Statistiques du document"
          >
            <BarChart3 size={20} strokeWidth={1} />
          </button>
          <button className="toolbar-btn" onClick={handleCheckCitations} title="Vérifier les citations">
            <CheckCircle size={20} strokeWidth={1} />
          </button>
        </div>

        {/* Preview button - disabled for now
        <div className="toolbar-section">
          <button
            className={`toolbar-btn ${showPreview ? 'active' : ''}`}
            onClick={togglePreview}
            title="Afficher/Masquer l'aperçu"
          >
            <Eye size={20} strokeWidth={1} />
          </button>
        </div>
        */}
      </div>

      {/* Stats bar (if enabled) - temporarily disabled for debugging */}
      {/* {showStats && <DocumentStats />} */}

      {/* Editor (Preview disabled for now) */}
      <div className="editor-content">
        <MarkdownEditor />
      </div>

      {/* Contextual Suggestions - Temporarily disabled due to runtime error */}
      {/* <ContextualSuggestions
        content={content}
        suggestionsConfig={suggestionsConfig}
      /> */}
    </div>
  );
};
