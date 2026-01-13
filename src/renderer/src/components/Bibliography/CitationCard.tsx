import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Citation, useBibliographyStore } from '../../stores/bibliographyStore';
import './CitationCard.css';

interface CitationCardProps {
  citation: Citation;
}

export const CitationCard: React.FC<CitationCardProps> = ({ citation }) => {
  const { t } = useTranslation('common');
  const [isExpanded, setIsExpanded] = useState(false);
  const { selectCitation, insertCitation, indexPDFFromCitation } = useBibliographyStore();

  const handleInsert = () => {
    insertCitation(citation.id);
  };

  const handleIndexPDF = async () => {
    try {
      await indexPDFFromCitation(citation.id);
      alert(`${t('bibliography.pdfIndexed')} ${citation.title}`);
    } catch (error) {
      alert(`${t('bibliography.indexError')} ${error}`);
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
              <span className="detail-label">{t('bibliography.journal')}</span>
              <span className="detail-value">{citation.journal}</span>
            </div>
          )}
          {citation.publisher && (
            <div className="detail-item">
              <span className="detail-label">{t('bibliography.publisher')}</span>
              <span className="detail-value">{citation.publisher}</span>
            </div>
          )}
          {citation.booktitle && (
            <div className="detail-item">
              <span className="detail-label">{t('bibliography.booktitle')}</span>
              <span className="detail-value">{citation.booktitle}</span>
            </div>
          )}

          <div className="citation-actions">
            <button className="action-btn primary" onClick={handleInsert}>
              ✍️ {t('bibliography.insertCitation')}
            </button>
            {hasPDF && (
              <button className="action-btn secondary" onClick={handleIndexPDF}>
                🔍 {t('bibliography.indexPDFButton')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
