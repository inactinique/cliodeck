import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CollapsibleSection } from '../common/CollapsibleSection';

export const ActionsSection: React.FC = () => {
  const { t } = useTranslation('common');
  const [stats, setStats] = useState({ totalDocuments: 0, totalChunks: 0, databasePath: '' });
  const [isPurging, setIsPurging] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const result = await window.electron.pdf.getStatistics();
      if (result.success && result.statistics) {
        setStats({
          totalDocuments: result.statistics.totalDocuments || 0,
          totalChunks: result.statistics.totalChunks || 0,
          databasePath: result.statistics.databasePath || '',
        });
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handlePurgeDatabase = async () => {
    const confirmMessage = t('actions.purgeDatabase.confirmMessage', {
      totalDocuments: stats.totalDocuments,
      totalChunks: stats.totalChunks
    });

    if (!window.confirm(confirmMessage)) {
      return;
    }

    // Double confirmation
    if (!window.confirm(t('actions.purgeDatabase.finalConfirm'))) {
      return;
    }

    setIsPurging(true);
    try {
      // Purge the vector database
      const result = await window.electron.pdf.purge();

      if (result.success) {
        console.log('✅ Database purged successfully');
        alert(t('actions.purgeDatabase.success'));
      } else {
        console.error('❌ Failed to purge database:', result.error);
        alert(t('actions.purgeDatabase.error', { error: result.error }));
      }

      // Reload statistics to show empty database
      await loadStats();
    } catch (error) {
      console.error('Failed to purge database:', error);
      alert(t('actions.purgeDatabase.error', { error: String(error) }));
    } finally {
      setIsPurging(false);
    }
  };

  const handleOpenDatabaseFolder = () => {
    if (stats.databasePath) {
      // Extract directory from full path
      const directory = stats.databasePath.split('/').slice(0, -1).join('/');
      window.electron.shell?.openPath(directory);
    }
  };

  const handleCopyDatabasePath = () => {
    if (stats.databasePath) {
      navigator.clipboard.writeText(stats.databasePath);
      alert(t('actions.copyPath.success'));
    }
  };

  return (
    <CollapsibleSection title={t('actions.title')} defaultExpanded={false}>
      <div className="config-section">
        <div className="config-section-content">
          {/* Database Info */}
          <div className="config-field">
            <label className="config-label">
              {t('actions.databaseInfo.title')}
            </label>
            <div className="config-description" style={{ marginTop: '8px' }}>
              <strong>{t('actions.databaseInfo.documentsIndexed')}:</strong> {stats.totalDocuments}
              <br />
              <strong>{t('actions.databaseInfo.chunksStored')}:</strong> {stats.totalChunks}
              <br />
              <strong>{t('actions.databaseInfo.path')}:</strong>
              <div style={{
                marginTop: '4px',
                padding: '8px',
                background: '#3c3c3c',
                borderRadius: '4px',
                fontSize: '12px',
                fontFamily: 'monospace',
                wordBreak: 'break-all',
              }}>
                {stats.databasePath || t('actions.databaseInfo.loading')}
              </div>
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                <button
                  className="config-btn-small"
                  onClick={handleCopyDatabasePath}
                  disabled={!stats.databasePath}
                >
                  {t('actions.copyPath.button')}
                </button>
                <button
                  className="config-btn-small"
                  onClick={handleOpenDatabaseFolder}
                  disabled={!stats.databasePath}
                >
                  {t('actions.openFolder.button')}
                </button>
              </div>
            </div>
          </div>

          {/* Purge Database */}
          <div className="config-field" style={{ marginTop: '24px' }}>
            <label className="config-label" style={{ color: '#f48771' }}>
              {t('actions.dangerZone')}
            </label>
            <div className="config-description">
              <strong>{t('actions.purgeDatabase.title')}</strong>
              <br />
              <small>
                {t('actions.purgeDatabase.description')}
                <br />
                {t('actions.purgeDatabase.warning')}
              </small>
            </div>
            <button
              className="config-btn-small"
              onClick={handlePurgeDatabase}
              disabled={isPurging || stats.totalDocuments === 0}
              style={{
                marginTop: '8px',
                background: '#c72e0f',
                color: '#ffffff',
                border: 'none',
              }}
            >
              {isPurging ? t('actions.purgeDatabase.inProgress') : t('actions.purgeDatabase.button')}
            </button>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
};
