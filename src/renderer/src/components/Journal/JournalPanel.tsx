import React, { useEffect, useState } from 'react';
import { useJournalStore } from '../../stores/journalStore';
import { SessionTimeline } from './SessionTimeline';
import { AIOperationsTable } from './AIOperationsTable';
import { ChatHistoryView } from './ChatHistoryView';
import { HelperTooltip } from '../Methodology/HelperTooltip';
import './JournalPanel.css';

export const JournalPanel: React.FC = () => {
  const {
    sessions,
    selectedSession,
    events,
    aiOperations,
    chatMessages,
    statistics,
    loading,
    error,
    loadSessions,
    selectSession,
    loadStatistics,
    exportReport,
    clearError,
  } = useJournalStore();

  const [viewMode, setViewMode] = useState<'sessions' | 'timeline' | 'ai-ops' | 'chat'>(
    'sessions'
  );

  // Load sessions and statistics on mount
  useEffect(() => {
    loadSessions();
    loadStatistics();
  }, [loadSessions, loadStatistics]);

  const handleLearnMore = () => {
    window.dispatchEvent(new CustomEvent('show-methodology-modal', { detail: { feature: 'journal' } }));
  };

  if (loading && sessions.length === 0) {
    return (
      <div className="journal-panel">
        <div className="journal-loading">
          <div className="loading-spinner"></div>
          <p>Chargement du journal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="journal-panel">
      {/* Header */}
      <div className="journal-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <h2>Journal de Recherche</h2>
          <HelperTooltip
            content="Traçabilité complète de votre processus de recherche. Exportable pour annexes académiques."
            onLearnMore={handleLearnMore}
          />
        </div>
        {statistics && (
          <div className="journal-stats-compact">
            <span>{statistics.totalSessions} sessions</span>
            <span>{statistics.totalEvents} événements</span>
            <span>{statistics.totalAIOperations} opérations IA</span>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="journal-error">
          <p>{error}</p>
          <button onClick={clearError}>Fermer</button>
        </div>
      )}

      {/* View tabs */}
      <div className="journal-view-tabs">
        <button
          className={viewMode === 'sessions' ? 'active' : ''}
          onClick={() => setViewMode('sessions')}
        >
          Sessions
        </button>
        <button
          className={viewMode === 'timeline' ? 'active' : ''}
          onClick={() => setViewMode('timeline')}
          disabled={!selectedSession}
        >
          Timeline
        </button>
        <button
          className={viewMode === 'ai-ops' ? 'active' : ''}
          onClick={() => setViewMode('ai-ops')}
          disabled={!selectedSession}
        >
          Opérations IA
        </button>
        <button
          className={viewMode === 'chat' ? 'active' : ''}
          onClick={() => setViewMode('chat')}
          disabled={!selectedSession}
        >
          Historique Chat
        </button>
      </div>

      {/* Content */}
      <div className="journal-content">
        {viewMode === 'sessions' && (
          <div className="sessions-list">
            {sessions.length === 0 ? (
              <div className="empty-state">
                <p>Aucune session enregistrée</p>
                <p className="help-text">
                  Les sessions sont créées automatiquement lorsque vous ouvrez un projet.
                </p>
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className={`session-card ${selectedSession?.id === session.id ? 'selected' : ''}`}
                  onClick={() => selectSession(session.id)}
                >
                  <div className="session-header">
                    <span className="session-date">
                      {session.startedAt.toLocaleDateString('fr-FR')}
                    </span>
                    <span className="session-time">
                      {session.startedAt.toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="session-info">
                    <span className="session-duration">
                      {session.totalDurationMs
                        ? `${Math.round(session.totalDurationMs / 1000 / 60)} min`
                        : 'Active'}
                    </span>
                    <span className="session-events">{session.eventCount} événements</span>
                  </div>
                  {selectedSession?.id === session.id && (
                    <div className="session-actions">
                      <button onClick={(e) => {
                        e.stopPropagation();
                        exportReport(session.id, 'markdown');
                      }}>
                        Export MD
                      </button>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        exportReport(session.id, 'json');
                      }}>
                        Export JSON
                      </button>
                      <button onClick={(e) => {
                        e.stopPropagation();
                        exportReport(session.id, 'latex');
                      }}>
                        Export LaTeX
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {viewMode === 'timeline' && selectedSession && <SessionTimeline events={events} />}

        {viewMode === 'ai-ops' && selectedSession && (
          <AIOperationsTable operations={aiOperations} />
        )}

        {viewMode === 'chat' && selectedSession && (
          <ChatHistoryView messages={chatMessages} />
        )}
      </div>
    </div>
  );
};
