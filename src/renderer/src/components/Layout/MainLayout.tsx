import React, { useState } from 'react';
import { MessageCircle, FileText, Settings, Folder, BookOpen, FileDown } from 'lucide-react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { BibliographyPanel } from '../Bibliography/BibliographyPanel';
import { PDFIndexPanel } from '../PDFIndex/PDFIndexPanel';
import { ChatInterface } from '../Chat/ChatInterface';
import { ConfigPanel } from '../Config/ConfigPanel';
import { ProjectPanel } from '../Project/ProjectPanel';
import { PDFExportModal } from '../Export/PDFExportModal';
import { logger } from '../../utils/logger';
import './MainLayout.css';

type LeftPanelView = 'projects' | 'bibliography';
type RightPanelView = 'chat' | 'pdfIndex' | 'settings';

export interface MainLayoutProps {
  leftPanel?: React.ReactNode;
  centerPanel?: React.ReactNode;
  rightPanel?: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  leftPanel,
  centerPanel,
  rightPanel,
}) => {
  const [leftView, setLeftView] = useState<LeftPanelView>('projects');
  const [rightView, setRightView] = useState<RightPanelView>('chat');
  const [showExportModal, setShowExportModal] = useState(false);

  const handleLeftViewChange = (view: LeftPanelView) => {
    logger.component('MainLayout', 'Left tab clicked', { view });
    setLeftView(view);
  };

  const handleRightViewChange = (view: RightPanelView) => {
    logger.component('MainLayout', 'Right tab clicked', { view });
    setRightView(view);
  };

  return (
    <div className="main-layout">
      {/* Top Toolbar */}
      <div className="toolbar">
        <div className="toolbar-left">
          <h1 className="app-title">mdFocus</h1>
        </div>
        <div className="toolbar-center">
          <span className="project-name">Sans titre</span>
        </div>
        <div className="toolbar-right">
          <button className="toolbar-button" onClick={() => setShowExportModal(true)} title="Exporter en PDF">
            <FileDown size={20} strokeWidth={1} />
          </button>
          <button className="toolbar-button" onClick={() => handleRightViewChange('settings')}>
            <Settings size={20} strokeWidth={1} />
          </button>
        </div>
      </div>

      {/* Main 3-panel layout */}
      <div className="main-content">
        <PanelGroup direction="horizontal">
          {/* Left Panel - Projects / Bibliography */}
          <Panel defaultSize={20} minSize={15} maxSize={35}>
            <div className="panel left-panel">
              {/* Panel tabs */}
              <div className="panel-tabs">
                <button
                  className={`panel-tab ${leftView === 'projects' ? 'active' : ''}`}
                  onClick={() => handleLeftViewChange('projects')}
                  title="Projets"
                >
                  <Folder size={20} strokeWidth={1} />
                </button>
                <button
                  className={`panel-tab ${leftView === 'bibliography' ? 'active' : ''}`}
                  onClick={() => handleLeftViewChange('bibliography')}
                  title="Bibliographie"
                >
                  <BookOpen size={20} strokeWidth={1} />
                </button>
              </div>

              {/* Panel content */}
              <div className="panel-content">
                {leftView === 'projects' && (leftPanel || <ProjectPanel />)}
                {leftView === 'bibliography' && <BibliographyPanel />}
              </div>
            </div>
          </Panel>

          <PanelResizeHandle className="resize-handle" />

          {/* Center Panel - Markdown Editor */}
          <Panel defaultSize={50} minSize={30}>
            <div className="panel center-panel">
              {centerPanel || (
                <div className="panel-placeholder">Éditeur Markdown (Monaco Editor)</div>
              )}
            </div>
          </Panel>

          <PanelResizeHandle className="resize-handle" />

          {/* Right Panel - Chat RAG / PDF Index / Settings */}
          <Panel defaultSize={30} minSize={20} maxSize={45}>
            <div className="panel right-panel">
              {/* Panel tabs */}
              <div className="panel-tabs">
                <button
                  className={`panel-tab ${rightView === 'chat' ? 'active' : ''}`}
                  onClick={() => handleRightViewChange('chat')}
                  title="Chat"
                >
                  <MessageCircle size={20} strokeWidth={1} />
                </button>
                <button
                  className={`panel-tab ${rightView === 'pdfIndex' ? 'active' : ''}`}
                  onClick={() => handleRightViewChange('pdfIndex')}
                  title="PDFs"
                >
                  <FileText size={20} strokeWidth={1} />
                </button>
                <button
                  className={`panel-tab ${rightView === 'settings' ? 'active' : ''}`}
                  onClick={() => handleRightViewChange('settings')}
                  title="Configuration"
                >
                  <Settings size={20} strokeWidth={1} />
                </button>
              </div>

              {/* Panel content */}
              <div className="panel-content">
                {rightView === 'chat' && <ChatInterface />}
                {rightView === 'pdfIndex' && <PDFIndexPanel />}
                {rightView === 'settings' && <ConfigPanel />}
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>

      {/* PDF Export Modal */}
      <PDFExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />
    </div>
  );
};
