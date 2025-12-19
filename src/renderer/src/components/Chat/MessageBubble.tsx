import React, { useMemo } from 'react';
import { marked } from 'marked';
import { ChatMessage } from '../../stores/chatStore';
import { SourceCard } from './SourceCard';
import './MessageBubble.css';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isStreaming = false }) => {
  const isUser = message.role === 'user';

  // Parse markdown for assistant messages
  const htmlContent = useMemo(() => {
    if (isUser) return null;

    try {
      return marked.parse(message.content, {
        breaks: true,
        gfm: true,
      });
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return message.content;
    }
  }, [message.content, isUser]);

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className={`message-bubble ${isUser ? 'user' : 'assistant'}`}>
      <div className="message-header">
        <span className="message-avatar">{isUser ? '👤' : '🤖'}</span>
        <span className="message-role">{isUser ? 'Vous' : 'Assistant'}</span>
        <span className="message-time">{formatTime(message.timestamp)}</span>
        {isStreaming && <span className="streaming-indicator">●</span>}
      </div>

      <div className="message-content">
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <div
            className="message-markdown"
            dangerouslySetInnerHTML={{ __html: htmlContent || message.content }}
          />
        )}
      </div>

      {/* Sources */}
      {message.sources && message.sources.length > 0 && (
        <div className="message-sources">
          <div className="sources-header">
            <span className="sources-icon">📚</span>
            <span className="sources-title">Sources ({message.sources.length})</span>
          </div>
          <div className="sources-list">
            {message.sources.map((source, index) => (
              <SourceCard key={index} source={source} index={index + 1} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
