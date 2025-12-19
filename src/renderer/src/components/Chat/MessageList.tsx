import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '../../stores/chatStore';
import { MessageBubble } from './MessageBubble';
import { useChatStore } from '../../stores/chatStore';
import './MessageList.css';

interface MessageListProps {
  messages: ChatMessage[];
}

export const MessageList: React.FC<MessageListProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isProcessing, currentStreamingMessage } = useChatStore();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStreamingMessage]);

  return (
    <div className="message-list">
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {/* Streaming message (in-progress) */}
      {isProcessing && currentStreamingMessage && (
        <MessageBubble
          message={{
            id: 'streaming',
            role: 'assistant',
            content: currentStreamingMessage,
            timestamp: new Date(),
          }}
          isStreaming={true}
        />
      )}

      {/* Typing indicator */}
      {isProcessing && !currentStreamingMessage && (
        <div className="typing-indicator">
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
          <div className="typing-dot"></div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
