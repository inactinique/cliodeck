import React, { useState } from 'react';
import { ChatSource } from '../../stores/chatStore';
import './SourceCard.css';

interface SourceCardProps {
  source: ChatSource;
  index: number;
}

export const SourceCard: React.FC<SourceCardProps> = ({ source, index }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleOpenPDF = () => {
    // TODO: Call IPC to open PDF at specific page
    window.electron.pdf.openAtPage(source.documentId, source.pageNumber);
  };

  const formatReference = () => {
    if (source.author && source.year) {
      return `${source.author} (${source.year})`;
    }
    return source.documentTitle;
  };

  const formatSimilarity = () => {
    return `${Math.round(source.similarity * 100)}%`;
  };

  return (
    <div className="source-card">
      <div className="source-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="source-index">Source {index}</div>
        <div className="source-info">
          <div className="source-title">{formatReference()}</div>
          <div className="source-meta">
            Page {source.pageNumber} • Similarité {formatSimilarity()}
          </div>
        </div>
        <button className="source-expand-btn">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div className="source-content">
          <div className="source-excerpt">
            <div className="excerpt-label">Extrait:</div>
            <p className="excerpt-text">{source.chunkContent}</p>
          </div>
          <div className="source-actions">
            <button className="source-action-btn" onClick={handleOpenPDF}>
              📄 Ouvrir le PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
