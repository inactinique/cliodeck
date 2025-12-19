import React, { useState } from 'react';
import { Citation, useBibliographyStore } from '../../stores/bibliographyStore';
import './CitationCard.css';

interface CitationCardProps {
  citation: Citation;
}

export const CitationCard: React.FC<CitationCardProps> = ({ citation }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { selectCitation, insertCitation, indexPDFFromCitation } = useBibliographyStore();

  const handleInsert = () => {
    insertCitation(citation.id);
  };

  const handleIndexPDF = async () => {
    try {
      await indexPDFFromCitation(citation.id);
      alert(`PDF indexé: ${citation.title}`);
    } catch (error) {
      alert(`Erreur: ${error}`);
    }
  };

  const hasPDF = !!citation.file;

  return (
    <div className="citation-card" onClick={() => selectCitation(citation.id)}>
      <div className="citation-header" onClick={(e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
      }}>
        <div className="citation-main">
          <div className="citation-author">{citation.author}</div>
          <div className="citation-year">({citation.year})</div>
          {hasPDF && <span className="pdf-badge">📄</span>}
        </div>
        <button className="expand-btn">
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      <div className="citation-title">{citation.title}</div>

      {isExpanded && (
        <div className="citation-details">
          {citation.journal && (
            <div className="detail-item">
              <span className="detail-label">Journal:</span>
              <span className="detail-value">{citation.journal}</span>
            </div>
          )}
          {citation.publisher && (
            <div className="detail-item">
              <span className="detail-label">Éditeur:</span>
              <span className="detail-value">{citation.publisher}</span>
            </div>
          )}
          {citation.booktitle && (
            <div className="detail-item">
              <span className="detail-label">Ouvrage:</span>
              <span className="detail-value">{citation.booktitle}</span>
            </div>
          )}

          <div className="citation-actions">
            <button className="action-btn primary" onClick={handleInsert}>
              ✍️ Insérer citation
            </button>
            {hasPDF && (
              <button className="action-btn secondary" onClick={handleIndexPDF}>
                🔍 Indexer PDF
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
