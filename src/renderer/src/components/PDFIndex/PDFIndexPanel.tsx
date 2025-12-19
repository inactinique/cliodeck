import React, { useState, useEffect } from 'react';
import { PDFList } from './PDFList';
import { IndexingProgress } from './IndexingProgress';
import './PDFIndexPanel.css';

interface PDFDocument {
  id: string;
  title: string;
  author?: string;
  year?: string;
  pageCount: number;
  indexedAt: Date;
}

interface IndexingState {
  isIndexing: boolean;
  currentFile?: string;
  progress: number;
  stage: string;
}

export const PDFIndexPanel: React.FC = () => {
  const [documents, setDocuments] = useState<PDFDocument[]>([]);
  const [indexingState, setIndexingState] = useState<IndexingState>({
    isIndexing: false,
    progress: 0,
    stage: '',
  });
  const [stats, setStats] = useState({
    totalDocuments: 0,
    totalChunks: 0,
  });

  useEffect(() => {
    loadDocuments();
    loadStats();
  }, []);

  const loadDocuments = async () => {
    try {
      const result = await window.electron.pdf.getAll();
      console.log('[PDFIndexPanel] getAll result:', result);
      if (result.success && Array.isArray(result.documents)) {
        setDocuments(result.documents);
      } else {
        console.error('[PDFIndexPanel] Invalid response from pdf.getAll:', result);
        setDocuments([]);
      }
    } catch (error) {
      console.error('[PDFIndexPanel] Failed to load documents:', error);
      setDocuments([]);
    }
  };

  const loadStats = async () => {
    try {
      const result = await window.electron.pdf.getStatistics();
      console.log('[PDFIndexPanel] getStatistics result:', result);
      if (result.success && result.statistics) {
        setStats({
          totalDocuments: result.statistics.totalDocuments,
          totalChunks: result.statistics.totalChunks,
        });
      } else {
        console.error('[PDFIndexPanel] Invalid response from pdf.getStatistics:', result);
        setStats({ totalDocuments: 0, totalChunks: 0 });
      }
    } catch (error) {
      console.error('[PDFIndexPanel] Failed to load stats:', error);
      setStats({ totalDocuments: 0, totalChunks: 0 });
    }
  };

  const handleAddPDF = async () => {
    try {
      const filePaths = await window.electron.dialog.openFile({
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
        multiple: true,
      });

      if (filePaths && filePaths.length > 0) {
        for (const filePath of filePaths) {
          await indexPDF(filePath);
        }
      }
    } catch (error) {
      console.error('Failed to add PDF:', error);
    }
  };

  const indexPDF = async (filePath: string) => {
    setIndexingState({
      isIndexing: true,
      currentFile: filePath,
      progress: 0,
      stage: 'Initialisation...',
    });

    try {
      await window.electron.pdf.index(filePath, undefined, (progress) => {
        setIndexingState({
          isIndexing: true,
          currentFile: filePath,
          progress: progress.progress,
          stage: progress.message,
        });
      });

      await loadDocuments();
      await loadStats();

      setIndexingState({
        isIndexing: false,
        progress: 100,
        stage: 'Terminé',
      });
    } catch (error) {
      console.error('Indexing failed:', error);
      setIndexingState({
        isIndexing: false,
        progress: 0,
        stage: 'Erreur',
      });
    }
  };

  const handleDeletePDF = async (documentId: string) => {
    if (!window.confirm('Supprimer ce document et tous ses chunks ?')) {
      return;
    }

    try {
      await window.electron.pdf.delete(documentId);
      await loadDocuments();
      await loadStats();
    } catch (error) {
      console.error('Failed to delete document:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.name.toLowerCase().endsWith('.pdf')
    );

    for (const file of files) {
      await indexPDF(file.path);
    }
  };

  return (
    <div className="pdf-index-panel">
      {/* Header */}
      <div className="pdf-header">
        <div className="header-title">
          <span className="header-icon">📄</span>
          <h3>Documents PDF</h3>
        </div>
        <button className="add-btn" onClick={handleAddPDF} title="Ajouter PDF">
          ➕
        </button>
      </div>

      {/* Stats */}
      <div className="pdf-stats">
        <div className="stat-item">
          <span className="stat-value">{stats.totalDocuments}</span>
          <span className="stat-label">Documents</span>
        </div>
        <div className="stat-divider">|</div>
        <div className="stat-item">
          <span className="stat-value">{stats.totalChunks}</span>
          <span className="stat-label">Chunks</span>
        </div>
      </div>

      {/* Indexing Progress */}
      {indexingState.isIndexing && (
        <IndexingProgress
          fileName={indexingState.currentFile || ''}
          progress={indexingState.progress}
          stage={indexingState.stage}
        />
      )}

      {/* Document List */}
      <div
        className="pdf-content"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {documents.length === 0 ? (
          <div className="pdf-empty">
            <div className="empty-icon">📂</div>
            <h4>Aucun document</h4>
            <p>
              Glissez-déposez des PDFs ici
              <br />
              ou cliquez sur + pour en ajouter
            </p>
          </div>
        ) : (
          <PDFList documents={documents} onDelete={handleDeletePDF} />
        )}
      </div>
    </div>
  );
};
