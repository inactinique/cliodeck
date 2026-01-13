import React from 'react';
import { useTranslation } from 'react-i18next';
import { CollapsibleSection } from '../common/CollapsibleSection';
import { useLanguageStore } from '../../stores/languageStore';
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../../i18n';

export const LanguageConfigSection: React.FC = () => {
  const { t } = useTranslation('common');
  const { currentLanguage, setLanguage } = useLanguageStore();

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value as SupportedLanguage;
    await setLanguage(newLanguage);
  };

  return (
    <CollapsibleSection title={t('settings.language')} defaultExpanded={false}>
      <div className="config-section">
        <div className="config-section-content">
          <div className="config-field">
            <label className="config-label">
              {t('settings.selectLanguage')}
              <span className="config-help">
                {t('settings.languageSelector.label')}
              </span>
            </label>
            <select
              value={currentLanguage}
              onChange={handleLanguageChange}
              className="config-select"
            >
              {Object.entries(SUPPORTED_LANGUAGES).map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
            <div className="config-description">
              <small>
                • {t('settings.languageSelector.changeWarning')}
              </small>
            </div>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
};
