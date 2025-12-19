import React, { useState } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { BibliographyPanel } from '../Bibliography/BibliographyPanel';
import { PDFIndexPanel } from '../PDFIndex/PDFIndexPanel';
import { ChatInterface } from '../Chat/ChatInterface';
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
          <button className="toolbar-button" onClick={() => handleRightViewChange('settings')}>
            ⚙️
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
                >
                  📁 Projets
                </button>
                <button
                  className={`panel-tab ${leftView === 'bibliography' ? 'active' : ''}`}
                  onClick={() => handleLeftViewChange('bibliography')}
                >
                  📚 Bibliographie
                </button>
              </div>

              {/* Panel content */}
              <div className="panel-content">
                {leftView === 'projects' && (
                  leftPanel || (
                    <div className="panel-placeholder">
                      <p style={{ color: '#888', fontSize: '13px' }}>Aucun projet</p>
                    </div>
                  )
                )}
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
                >
                  💬 Chat
                </button>
                <button
                  className={`panel-tab ${rightView === 'pdfIndex' ? 'active' : ''}`}
                  onClick={() => handleRightViewChange('pdfIndex')}
                >
                  📄 PDFs
                </button>
                <button
                  className={`panel-tab ${rightView === 'settings' ? 'active' : ''}`}
                  onClick={() => handleRightViewChange('settings')}
                >
                  ⚙️ Config
                </button>
              </div>

              {/* Panel content */}
              <div className="panel-content">
                {rightView === 'chat' && <ChatInterface />}
                {rightView === 'pdfIndex' && <PDFIndexPanel />}
                {rightView === 'settings' && (
                  <div className="panel-placeholder">
                    <div style={{ padding: '16px' }}>
                      <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#cccccc' }}>
                        Configuration
                      </h3>
                      <p style={{ color: '#888', fontSize: '13px' }}>
                        Panneau de configuration à venir
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
};
