import React from 'react';
import { HistoryEvent } from '../../stores/journalStore';

interface Props {
  events: HistoryEvent[];
}

export const SessionTimeline: React.FC<Props> = ({ events }) => {
  // Format event data for display
  const formatEventData = (eventData: any): string => {
    if (!eventData) return '';
    const str = JSON.stringify(eventData);
    return str.length > 80 ? str.substring(0, 80) + '...' : str;
  };

  return (
    <div className="session-timeline">
      <h3>Timeline des Événements</h3>

      {events.length === 0 ? (
        <div className="empty-state">
          <p>Aucun événement dans cette session</p>
        </div>
      ) : (
        <div className="timeline-vertical">
          {events.map((event, index) => (
            <div key={event.id} className="timeline-item">
              {/* Timeline connector */}
              <div className="timeline-connector">
                <div className="timeline-dot"></div>
                {index < events.length - 1 && <div className="timeline-line"></div>}
              </div>

              {/* Event content */}
              <div className="timeline-content">
                <div className="timeline-header">
                  <span className="timeline-event-type">{event.eventType}</span>
                  <span className="timeline-time">
                    {event.timestamp.toLocaleTimeString('fr-FR')}
                  </span>
                </div>
                {event.eventData && (
                  <div className="timeline-data">
                    {formatEventData(event.eventData)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
