/**
 * Similarity Card
 *
 * Displays a single PDF recommendation with actions.
 */
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Quote, ChevronDown, ChevronUp } from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';
import { logger } from '../../utils/logger';
import type { PDFRecommendation } from '../../stores/similarityStore';
import './SimilarityCard.css';

interface SimilarityCardProps {
  recommendation: PDFRecommendation;
}

export const SimilarityCard: React.FC<SimilarityCardProps> = ({ recommendation }) => {
  const { t } = useTranslation('common');
  const { insertTextAtCursor } = useEditorStore();
  const [showPreview, setShowPreview] = useState(false);

  const {
    pdfId,
    title,
    authors,
    similarity,
    chunkPreview,
    zoteroKey,
    pageNumber,
  } = recommendation;

  // Format similarity as percentage
  const similarityPercent = Math.round(similarity * 100);

  // Get similarity color class
  const getSimilarityClass = () => {
    if (similarityPercent >= 80) return 'similarity-high';
    if (similarityPercent >= 60) return 'similarity-medium';
    return 'similarity-low';
  };

  // Open PDF in system default viewer
  const handleOpenPDF = async () => {
    logger.component('SimilarityCard', 'Opening PDF', { pdfId, title });
    try {
      // Get document to find file path
      const result = await window.electron.pdf.getDocument(pdfId);
      if (result.success && result.document?.fileURL) {
        // Open the PDF file with the system default application
        await window.electron.shell.openPath(result.document.fileURL);
        logger.component('SimilarityCard', 'PDF opened', { path: result.document.fileURL });
      } else {
        logger.error('SimilarityCard', 'Document not found or no file path', { pdfId });
        alert(`Could not find PDF file for: ${title}`);
      }
    } catch (error) {
      logger.error('SimilarityCard', 'Failed to open PDF', error);
      alert(`Failed to open PDF: ${title}`);
    }
  };

  // Insert citation at cursor
  const handleInsertCitation = () => {
    logger.component('SimilarityCard', 'Inserting citation', { zoteroKey, title });

    let citation: string;
    if (zoteroKey) {
      // Use Pandoc/CSL citation format
      citation = `[@${zoteroKey}]`;
    } else {
      // Fallback: use title
      const shortTitle = title.length > 30 ? title.substring(0, 30) + '...' : title;
      citation = `[${shortTitle}]`;
    }

    insertTextAtCursor(citation);
  };

  return (
    <div className="similarity-card">
      {/* Header with title and similarity score */}
      <div className="similarity-card-header">
        <div className="similarity-card-info">
          <div className="similarity-card-title" title={title}>
            {title}
          </div>
          {authors.length > 0 && (
            <div className="similarity-card-authors">
              {authors.join(', ')}
            </div>
          )}
        </div>
        <div className={`similarity-card-score ${getSimilarityClass()}`}>
          {similarityPercent}%
        </div>
      </div>

      {/* Preview toggle */}
      {chunkPreview && (
        <button
          className="similarity-card-preview-toggle"
          onClick={() => setShowPreview(!showPreview)}
        >
          {showPreview ? (
            <>
              <ChevronUp size={14} />
              {t('similarity.hidePreview')}
            </>
          ) : (
            <>
              <ChevronDown size={14} />
              {t('similarity.showPreview')}
            </>
          )}
        </button>
      )}

      {/* Preview content */}
      {showPreview && chunkPreview && (
        <div className="similarity-card-preview">
          <p className="similarity-card-preview-text">{chunkPreview}</p>
          {pageNumber && (
            <span className="similarity-card-page">
              {t('similarity.page', { page: pageNumber })}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="similarity-card-actions">
        <button
          className="similarity-card-action"
          onClick={handleOpenPDF}
          title={t('similarity.openPDF')}
        >
          <ExternalLink size={14} />
          {t('similarity.openPDF')}
        </button>
        <button
          className="similarity-card-action"
          onClick={handleInsertCitation}
          title={t('similarity.insertCitation')}
        >
          <Quote size={14} />
          {t('similarity.insertCitation')}
        </button>
      </div>
    </div>
  );
};
