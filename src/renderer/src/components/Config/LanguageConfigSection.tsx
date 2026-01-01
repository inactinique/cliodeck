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
    <CollapsibleSection title={t('settings.language')} defaultExpanded={true}>
      <div className="config-section">
        <div className="config-section-content">
          <div className="config-field">
            <label className="config-label">
              {t('settings.selectLanguage')}
              <span className="config-help">
                {currentLanguage === 'fr' && 'Choisir la langue de l\'interface'}
                {currentLanguage === 'en' && 'Choose the interface language'}
                {currentLanguage === 'de' && 'Wählen Sie die Sprache der Benutzeroberfläche'}
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
                {currentLanguage === 'fr' && '• La langue sera appliquée immédiatement'}
                {currentLanguage === 'en' && '• Language will be applied immediately'}
                {currentLanguage === 'de' && '• Die Sprache wird sofort angewendet'}
              </small>
            </div>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
};
