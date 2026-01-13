import React from 'react';
import { useTranslation } from 'react-i18next';
import { CollapsibleSection } from '../common/CollapsibleSection';
import { useDensity, type Density } from '../../hooks/useDensity';

export const UIConfigSection: React.FC = () => {
  const { t } = useTranslation('common');
  const { density, setDensity } = useDensity();

  return (
    <CollapsibleSection title={t('ui.title')} defaultExpanded={false}>
      <div className="config-section">
        <div className="config-section-content">
          {/* Density */}
          <div className="config-field">
            <label className="config-label">
              {t('ui.density')}
              <span className="config-help">
                {t('ui.density')}
              </span>
            </label>
            <select
              value={density}
              onChange={(e) => setDensity(e.target.value as Density)}
              className="config-select"
            >
              <option value="comfortable">{t('ui.comfortable')}</option>
              <option value="compact">{t('ui.compact')}</option>
            </select>
            <div className="config-description">
              <small>
                {density === 'comfortable'
                  ? t('ui.comfortable')
                  : t('ui.compact')}
              </small>
            </div>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
};
