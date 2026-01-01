import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, FolderOpen, Save, Link, BookOpen, Table, Superscript, Quote, CheckCircle, Lightbulb } from 'lucide-react';
// import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { MarkdownEditor } from './MarkdownEditor';
// import { MarkdownPreview } from './MarkdownPreview';
import { DocumentStats } from './DocumentStats';
import { CitationSuggestionsPanel } from './CitationSuggestionsPanel';
// import { ContextualSuggestions } from './ContextualSuggestions';
import { useEditorStore } from '../../stores/editorStore';
import { useBibliographyStore } from '../../stores/bibliographyStore';
import { logger } from '../../utils/logger';
import './EditorPanel.css';

export const EditorPanel: React.FC = () => {
  const { t } = useTranslation('common');
  const { showSuggestions, toggleSuggestions, loadFile, saveFile, setContent, content, insertFormatting } = useEditorStore();
  const { citations } = useBibliographyStore();

  // Suggestions config - disabled while ContextualSuggestions is disabled
  // const [suggestionsConfig, setSuggestionsConfig] = React.useState({
  //   enableCitationSuggestions: true,
  //   citationSuggestionDelay: 500,
  //   maxCitationSuggestions: 5,
  //   enableReformulationSuggestions: false,
  //   reformulationDelay: 2000,
  //   reformulationMinWords: 10,
  //   showSuggestionsInline: true,
  // });

  // Load suggestions config on mount
  // React.useEffect(() => {
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
    if (window.confirm(t('toolbar.newFileConfirm'))) {
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
          { name: t('toolbar.markdown'), extensions: ['md', 'markdown'] },
          { name: t('project.allFiles'), extensions: ['*'] },
        ],
      });

      if (!result.canceled && result.filePaths.length > 0) {
        logger.component('EditorPanel', 'Loading file', { path: result.filePaths[0] });
        await loadFile(result.filePaths[0]);
        logger.component('EditorPanel', 'File loaded successfully');
      }
    } catch (error) {
      logger.error('EditorPanel', error);
      alert(t('toolbar.openError'));
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
            { name: t('toolbar.markdown'), extensions: ['md'] },
            { name: t('project.allFiles'), extensions: ['*'] },
          ],
        });

        if (!result.canceled && result.filePath) {
          logger.component('EditorPanel', 'Saving file as', { path: result.filePath });
          await useEditorStore.getState().saveFileAs(result.filePath);
          logger.component('EditorPanel', 'File saved successfully');
        }
      } else {
        logger.error('EditorPanel', error);
        alert(t('toolbar.saveError'));
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
          <button className="toolbar-btn" onClick={handleNewFile} title={t('toolbar.newFile')}>
            <FileText size={20} strokeWidth={1} />
          </button>
          <button className="toolbar-btn" onClick={handleOpenFile} title={t('toolbar.open')}>
            <FolderOpen size={20} strokeWidth={1} />
          </button>
          <button className="toolbar-btn" onClick={handleSaveFile} title={t('toolbar.save')}>
            <Save size={20} strokeWidth={1} />
          </button>
        </div>

        <div className="toolbar-section">
          <button className="toolbar-btn" onClick={handleBold} title={t('toolbar.bold')}>
            <strong>B</strong>
          </button>
          <button className="toolbar-btn" onClick={handleItalic} title={t('toolbar.italic')}>
            <em>I</em>
          </button>
          <button className="toolbar-btn" onClick={handleLink} title={t('toolbar.link')}>
            <Link size={20} strokeWidth={1} />
          </button>
          <button className="toolbar-btn" onClick={handleCitation} title={t('toolbar.citation')}>
            <BookOpen size={20} strokeWidth={1} />
          </button>
          <button className="toolbar-btn" onClick={handleTable} title={t('toolbar.table')}>
            <Table size={20} strokeWidth={1} />
          </button>
        </div>

        <div className="toolbar-section">
          <button className="toolbar-btn" onClick={handleFootnote} title={t('toolbar.footnote')}>
            <Superscript size={20} strokeWidth={1} />
          </button>
          <button className="toolbar-btn" onClick={handleBlockQuote} title={t('toolbar.blockquote')}>
            <Quote size={20} strokeWidth={1} />
          </button>
        </div>

        <div className="toolbar-section">
          <button className="toolbar-btn" onClick={handleCheckCitations} title={t('toolbar.checkCitations')}>
            <CheckCircle size={20} strokeWidth={1} />
          </button>
          <button
            className={`toolbar-btn ${showSuggestions ? 'active' : ''}`}
            onClick={toggleSuggestions}
            title={t('toolbar.citation')}
          >
            <Lightbulb size={20} strokeWidth={1} />
          </button>
        </div>

        {/* Preview button - disabled
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

      {/* Editor with optional suggestions panel */}
      <div className="editor-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: showSuggestions ? '1 1 70%' : '1 1 100%', overflow: 'auto' }}>
            <MarkdownEditor />
          </div>
          {showSuggestions && (
            <div style={{ flex: '0 0 30%', minWidth: '300px', maxWidth: '400px' }}>
              <CitationSuggestionsPanel />
            </div>
          )}
        </div>

        {/* Stats bar (always visible at the bottom) */}
        <DocumentStats />
      </div>

      {/* Contextual Suggestions - Disabled (overlay issues)
      <ContextualSuggestions
        content={content}
        suggestionsConfig={suggestionsConfig}
      />
      */}
    </div>
  );
};
