import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Citation, useBibliographyStore } from '../../stores/bibliographyStore';
import './CitationCard.css';

interface CitationCardProps {
  citation: Citation;
}

export const CitationCard: React.FC<CitationCardProps> = ({ citation }) => {
  const { t } = useTranslation('common');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const { selectCitation, insertCitation, indexPDFFromCitation, isFileIndexed, refreshIndexedPDFs } = useBibliographyStore();

  const hasPDF = !!citation.file;
  const isIndexed = hasPDF && isFileIndexed(citation.file!);

  // Refresh indexed status on mount
  useEffect(() => {
    refreshIndexedPDFs();
  }, []);

  const handleInsert = () => {
    insertCitation(citation.id);
  };

  const handleIndexPDF = async () => {
    if (isIndexing) return;

    setIsIndexing(true);
    try {
      const result = await indexPDFFromCitation(citation.id);
      if (result.alreadyIndexed) {
        alert(t('bibliography.alreadyIndexed', { title: citation.title }));
      } else {
        alert(`${t('bibliography.pdfIndexed')} ${citation.title}`);
      }
    } catch (error) {
      alert(`${t('bibliography.indexError')} ${error}`);
    } finally {
      setIsIndexing(false);
    }
  };

  return (
    <div className="citation-card" onClick={() => selectCitation(citation.id)}>
      <div className="citation-header" onClick={(e) => {
        e.stopPropagation();
        setIsExpanded(!isExpanded);
      }}>
        <div className="citation-main">
          <div className="citation-author">{citation.author}</div>
          <div className="citation-year">({citation.year})</div>
          {hasPDF && (
            <span className="pdf-badge" title={isIndexed ? t('bibliography.indexed') : t('bibliography.notIndexed')}>
              {isIndexed ? '✅' : '📄'}
            </span>
          )}
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
              <button
                className={`action-btn ${isIndexed ? 'indexed' : 'secondary'}`}
                onClick={handleIndexPDF}
                disabled={isIndexing}
              >
                {isIndexing ? '⏳' : isIndexed ? '✅' : '🔍'}{' '}
                {isIndexing
                  ? t('bibliography.indexing')
                  : isIndexed
                    ? t('bibliography.indexed')
                    : t('bibliography.indexPDFButton')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
