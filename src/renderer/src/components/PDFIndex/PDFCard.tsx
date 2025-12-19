import React, { useState } from 'react';
import './PDFCard.css';

interface PDFDocument {
  id: string;
  title: string;
  author?: string;
  year?: string;
  pageCount: number;
  indexedAt: Date;
}

interface PDFCardProps {
  document: PDFDocument;
  onDelete: (id: string) => void;
}

export const PDFCard: React.FC<PDFCardProps> = ({ document, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const formatReference = () => {
    if (document.author && document.year) {
      return `${document.author} (${document.year})`;
    }
    return document.title;
  };

  return (
    <div className="pdf-card">
      <div className="pdf-card-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="pdf-icon">📄</div>
        <div className="pdf-info">
          <div className="pdf-reference">{formatReference()}</div>
          <div className="pdf-meta">
            {document.pageCount} pages • Indexé le {formatDate(document.indexedAt)}
          </div>
        </div>
        <button className="expand-btn">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div className="pdf-card-details">
          <div className="pdf-title">{document.title}</div>

          <div className="pdf-actions">
            <button className="pdf-action-btn danger" onClick={() => onDelete(document.id)}>
              🗑️ Supprimer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
