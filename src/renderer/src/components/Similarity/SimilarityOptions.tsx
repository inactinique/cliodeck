/**
 * Similarity Options
 *
 * Modal for configuring similarity analysis options.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';
import { useSimilarityStore, type Granularity } from '../../stores/similarityStore';
import './SimilarityOptions.css';

interface SimilarityOptionsProps {
  onClose: () => void;
}

export const SimilarityOptions: React.FC<SimilarityOptionsProps> = ({ onClose }) => {
  const { t } = useTranslation('common');
  const { options, setOptions } = useSimilarityStore();

  const handleGranularityChange = (granularity: Granularity) => {
    setOptions({ granularity });
  };

  const handleMaxResultsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (value >= 1 && value <= 20) {
      setOptions({ maxResults: value });
    }
  };

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (value >= 0 && value <= 1) {
      setOptions({ similarityThreshold: value });
    }
  };

  return (
    <div className="similarity-options-overlay" onClick={onClose}>
      <div className="similarity-options-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="similarity-options-header">
          <h3 className="similarity-options-title">{t('similarity.optionsTitle')}</h3>
          <button className="similarity-options-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="similarity-options-content">
          {/* Granularity */}
          <div className="similarity-option-group">
            <label className="similarity-option-label">
              {t('similarity.granularity')}
            </label>
            <p className="similarity-option-description">
              {t('similarity.granularityDescription')}
            </p>
            <div className="similarity-option-buttons">
              <button
                className={`similarity-option-btn ${options.granularity === 'section' ? 'active' : ''}`}
                onClick={() => handleGranularityChange('section')}
              >
                <span className="similarity-option-btn-icon">📑</span>
                <span className="similarity-option-btn-label">{t('similarity.granularity.section')}</span>
              </button>
              <button
                className={`similarity-option-btn ${options.granularity === 'paragraph' ? 'active' : ''}`}
                onClick={() => handleGranularityChange('paragraph')}
              >
                <span className="similarity-option-btn-icon">📝</span>
                <span className="similarity-option-btn-label">{t('similarity.granularity.paragraph')}</span>
              </button>
              <button
                className={`similarity-option-btn ${options.granularity === 'sentence' ? 'active' : ''}`}
                onClick={() => handleGranularityChange('sentence')}
              >
                <span className="similarity-option-btn-icon">💬</span>
                <span className="similarity-option-btn-label">{t('similarity.granularity.sentence')}</span>
              </button>
            </div>
          </div>

          {/* Max Results */}
          <div className="similarity-option-group">
            <label className="similarity-option-label">
              {t('similarity.maxResults')}
            </label>
            <p className="similarity-option-description">
              {t('similarity.maxResultsDescription')}
            </p>
            <div className="similarity-option-slider">
              <input
                type="range"
                min="1"
                max="10"
                value={options.maxResults}
                onChange={handleMaxResultsChange}
                className="similarity-slider"
              />
              <span className="similarity-slider-value">{options.maxResults}</span>
            </div>
          </div>

          {/* Similarity Threshold */}
          <div className="similarity-option-group">
            <label className="similarity-option-label">
              {t('similarity.threshold')}
            </label>
            <p className="similarity-option-description">
              {t('similarity.thresholdDescription')}
            </p>
            <div className="similarity-option-slider">
              <input
                type="range"
                min="0"
                max="0.1"
                step="0.005"
                value={options.similarityThreshold}
                onChange={handleThresholdChange}
                className="similarity-slider"
              />
              <span className="similarity-slider-value">
                {options.similarityThreshold === 0 ? t('similarity.noFilter') : `${(options.similarityThreshold * 100).toFixed(1)}%`}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="similarity-options-footer">
          <button className="similarity-options-done" onClick={onClose}>
            {t('common.done')}
          </button>
        </div>
      </div>
    </div>
  );
};
