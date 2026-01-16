import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, ExternalLink } from 'lucide-react';
import './AboutModal.css';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation('common');

  if (!isOpen) return null;

  const openExternalLink = (url: string) => {
    window.electron.shell.openExternal(url);
  };

  return (
    <div className="about-modal" onClick={onClose}>
      <div className="about-content" onClick={(e) => e.stopPropagation()}>
        <div className="about-header">
          <h3>{t('about.title')}</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        <div className="about-body">
          <div className="about-section">
            <p className="about-license">
              <strong>{t('about.license')}:</strong> AGPL{' '}
              <button
                className="about-link"
                onClick={() => openExternalLink('https://github.com/inactinique/cliodeck')}
              >
                {t('about.githubRepo')} <ExternalLink size={14} />
              </button>
            </p>
          </div>
          <div className="about-section">
            <p className="about-description">
              {t('about.description')}{' '}
              <button
                className="about-link"
                onClick={() => openExternalLink('https://inactinique.net')}
              >
                Frédéric Clavert <ExternalLink size={14} />
              </button>{' '}
              {t('about.developedWith')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
