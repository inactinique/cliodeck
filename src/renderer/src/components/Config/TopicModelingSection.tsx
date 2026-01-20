/**
 * TopicModelingSection - Gestion de l'environnement Python pour le topic modeling
 */
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CollapsibleSection } from '../common/CollapsibleSection';
import './ConfigPanel.css';

interface TopicModelingStatus {
  installed: boolean;
  venvPath?: string;
  pythonVersion?: string;
  error?: string;
}

export const TopicModelingSection: React.FC = () => {
  const { t } = useTranslation('common');
  const [status, setStatus] = useState<TopicModelingStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState<string[]>([]);

  // Load status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const result = await window.electron.topicModeling.checkStatus();
      console.log('Topic modeling status result:', result);
      if (result.success) {
        setStatus(result.data);
      } else {
        setStatus({ installed: false, error: result.error });
      }
    } catch (error: any) {
      console.error('Failed to check topic modeling status:', error);
      setStatus({ installed: false, error: error.message || t('topicModeling.installError') });
    } finally {
      setLoading(false);
    }
  };

  const setupEnvironment = async () => {
    setInstalling(true);
    setInstallProgress([]);

    // Listen for progress messages
    const removeListener = window.electron.topicModeling.onSetupProgress((message) => {
      setInstallProgress((prev) => [...prev, message]);
    });

    try {
      const result = await window.electron.topicModeling.setupEnvironment();

      if (result.success && result.data.success) {
        setInstallProgress((prev) => [...prev, `✅ ${t('topicModeling.installSuccess')}`]);
        // Reload status
        await checkStatus();
      } else {
        setInstallProgress((prev) => [
          ...prev,
          `❌ ${t('topicModeling.installError')}: ${result.data?.error || result.error || 'Unknown error'}`,
        ]);
      }
    } catch (error: any) {
      console.error('Failed to setup environment:', error);
      setInstallProgress((prev) => [...prev, `❌ ${t('topicModeling.installError')}: ${error.message}`]);
    } finally {
      setInstalling(false);
      removeListener();
    }
  };

  return (
    <CollapsibleSection title={t('topicModeling.title')} defaultExpanded={false}>
      <div className="config-section">
        <div className="config-section-content">
          <p className="config-help">
            {t('topicModeling.description')}
          </p>

          {loading ? (
            <p className="config-help">{t('topicModeling.loading')}</p>
          ) : (
            <>
              <div className="topic-modeling-status">
                <div className={`status-indicator ${status?.installed ? 'status-success' : 'status-warning'}`}>
                  <span className="status-dot"></span>
                  <span className="status-text">
                    {status?.installed ? t('topicModeling.installed') : t('topicModeling.notInstalled')}
                  </span>
                </div>

                {status?.installed && status.pythonVersion && (
                  <div className="status-details">
                    <p>{t('topicModeling.pythonVersion')}: {status.pythonVersion}</p>
                    <p className="status-path">{t('topicModeling.venvPath')}: {status.venvPath}</p>
                  </div>
                )}

                {status?.error && !status.installed && (
                  <div className="status-error">
                    <p>⚠️ {status.error}</p>
                  </div>
                )}
              </div>

              <div className="config-actions">
                {(!status || !status.installed) && (
                  <button onClick={setupEnvironment} disabled={installing} className="btn-primary">
                    {installing ? t('topicModeling.installingButton') : t('topicModeling.installButton')}
                  </button>
                )}

                {status && status.installed && (
                  <>
                    <button onClick={setupEnvironment} disabled={installing} className="btn-secondary">
                      {installing ? t('topicModeling.reinstallingButton') : t('topicModeling.reinstallButton')}
                    </button>
                    <button onClick={checkStatus} disabled={loading || installing} className="btn-secondary">
                      {t('topicModeling.checkButton')}
                    </button>
                  </>
                )}
              </div>

              {installing && installProgress.length > 0 && (
                <div className="install-progress">
                  <div className="progress-log">
                    {installProgress.map((msg, idx) => (
                      <div key={idx} className="progress-message">
                        {msg}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!installing && installProgress.length > 0 && (
                <button onClick={() => setInstallProgress([])} className="btn-text">
                  {t('topicModeling.clearLog')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </CollapsibleSection>
  );
};
