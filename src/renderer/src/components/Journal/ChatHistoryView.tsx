import React from 'react';
import { ChatMessage } from '../../stores/journalStore';

interface Props {
  messages: ChatMessage[];
}

export const ChatHistoryView: React.FC<Props> = ({ messages }) => {
  return (
    <div className="chat-history-view">
      <h3>Historique des Conversations</h3>

      {messages.length === 0 ? (
        <div className="empty-state">
          <p>Aucun message dans cette session</p>
        </div>
      ) : (
        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-message ${msg.role}`}>
              <div className="message-header">
                <span className="message-role">
                  {msg.role === 'user' ? 'Utilisateur' : 'Assistant'}
                </span>
                <span className="message-time">
                  {msg.timestamp.toLocaleTimeString('fr-FR')}
                </span>
              </div>
              <div className="message-content">{msg.content}</div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="message-sources">
                  <strong>Sources:</strong>
                  <ul>
                    {msg.sources.map((source: any, idx: number) => (
                      <li key={idx}>
                        {source.documentTitle || 'Document'} (p. {source.pageNumber}, similarité:{' '}
                        {source.similarity.toFixed(2)})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
