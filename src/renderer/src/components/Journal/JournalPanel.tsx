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
    allEvents,
    allAIOperations,
    allChatMessages,
    loading,
    error,
    hideEmptySessions,
    viewScope,
    loadSessions,
    selectSession,
    loadStatistics,
    exportReport,
    clearError,
    setHideEmptySessions,
    setViewScope,
    loadAllProjectData,
  } = useJournalStore();

  const [viewMode, setViewMode] = useState<'sessions' | 'timeline' | 'ai-ops' | 'chat'>(
    'sessions'
  );

  // Load sessions and statistics on mount
  useEffect(() => {
    loadSessions();
    loadStatistics();
  }, [loadSessions, loadStatistics]);

  // Load project data when switching to project scope
  useEffect(() => {
    if (viewScope === 'project') {
      loadAllProjectData();
    }
  }, [viewScope, loadAllProjectData]);

  const handleLearnMore = () => {
    window.dispatchEvent(new CustomEvent('show-methodology-modal', { detail: { feature: 'journal' } }));
  };

  // Filter sessions based on hideEmptySessions option
  const displayedSessions = hideEmptySessions
    ? sessions.filter((s) => s.eventCount > 0)
    : sessions;

  // Get data based on view scope
  const currentEvents = viewScope === 'project' ? allEvents : events;
  const currentAIOperations = viewScope === 'project' ? allAIOperations : aiOperations;
  const currentChatMessages = viewScope === 'project' ? allChatMessages : chatMessages;

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

      {/* Scope selector (Session vs Project) */}
      <div className="journal-scope-selector">
        <div className="scope-buttons">
          <button
            className={viewScope === 'session' ? 'active' : ''}
            onClick={() => setViewScope('session')}
          >
            Par session
          </button>
          <button
            className={viewScope === 'project' ? 'active' : ''}
            onClick={() => setViewScope('project')}
          >
            Vue d'ensemble du projet
          </button>
        </div>
        {viewScope === 'session' && (
          <label className="hide-empty-checkbox">
            <input
              type="checkbox"
              checked={hideEmptySessions}
              onChange={(e) => setHideEmptySessions(e.target.checked)}
            />
            Masquer les sessions vides
          </label>
        )}
      </div>

      {/* View tabs */}
      <div className="journal-view-tabs">
        {viewScope === 'session' && (
          <button
            className={viewMode === 'sessions' ? 'active' : ''}
            onClick={() => setViewMode('sessions')}
          >
            Sessions
          </button>
        )}
        <button
          className={viewMode === 'timeline' ? 'active' : ''}
          onClick={() => setViewMode('timeline')}
          disabled={viewScope === 'session' && !selectedSession}
        >
          Timeline
        </button>
        <button
          className={viewMode === 'ai-ops' ? 'active' : ''}
          onClick={() => setViewMode('ai-ops')}
          disabled={viewScope === 'session' && !selectedSession}
        >
          Opérations IA
        </button>
        <button
          className={viewMode === 'chat' ? 'active' : ''}
          onClick={() => setViewMode('chat')}
          disabled={viewScope === 'session' && !selectedSession}
        >
          Historique Chat
        </button>
      </div>

      {/* Content */}
      <div className="journal-content">
        {/* Sessions view (only in session scope) */}
        {viewScope === 'session' && viewMode === 'sessions' && (
          <div className="sessions-list">
            {displayedSessions.length === 0 ? (
              <div className="empty-state">
                {hideEmptySessions && sessions.length > 0 ? (
                  <>
                    <p>Toutes les sessions sont vides</p>
                    <p className="help-text">
                      Décochez "Masquer les sessions vides" pour voir toutes les sessions.
                    </p>
                  </>
                ) : (
                  <>
                    <p>Aucune session enregistrée</p>
                    <p className="help-text">
                      Les sessions sont créées automatiquement lorsque vous ouvrez un projet.
                    </p>
                  </>
                )}
              </div>
            ) : (
              displayedSessions.map((session) => (
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

        {/* Timeline view */}
        {viewMode === 'timeline' && (viewScope === 'project' || selectedSession) && (
          <SessionTimeline
            events={currentEvents}
            title={viewScope === 'project' ? 'Timeline complète du projet' : 'Timeline de la session'}
          />
        )}

        {/* AI Operations view */}
        {viewMode === 'ai-ops' && (viewScope === 'project' || selectedSession) && (
          <AIOperationsTable operations={currentAIOperations} />
        )}

        {/* Chat History view */}
        {viewMode === 'chat' && (viewScope === 'project' || selectedSession) && (
          <ChatHistoryView messages={currentChatMessages} />
        )}

        {/* Empty state for project view when in sessions tab */}
        {viewScope === 'project' && viewMode === 'sessions' && (
          <div className="empty-state">
            <p>Sélectionnez une vue ci-dessus</p>
            <p className="help-text">
              En mode "Vue d'ensemble du projet", vous pouvez voir la timeline, les opérations IA
              et l'historique de chat agrégés pour toutes les sessions.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
