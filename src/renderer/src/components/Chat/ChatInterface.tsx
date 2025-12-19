import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import './ChatInterface.css';
import { logger } from '../../utils/logger';

export const ChatInterface: React.FC = () => {
  const { messages, isProcessing, sendMessage, cancelGeneration, clearChat } = useChatStore();
  const [inputValue, setInputValue] = useState('');

  const handleSend = async () => {
    logger.component('ChatInterface', 'handleSend called', { inputValue, isProcessing });
    if (!inputValue.trim() || isProcessing) {
      logger.component('ChatInterface', 'Send blocked - empty input or processing');
      return;
    }

    const query = inputValue.trim();
    setInputValue('');

    try {
      logger.component('ChatInterface', 'Calling sendMessage', { query });
      await sendMessage(query);
    } catch (error) {
      logger.error('ChatInterface', error);
    }
  };

  const handleCancel = () => {
    logger.component('ChatInterface', 'handleCancel called');
    cancelGeneration();
  };

  const handleClear = () => {
    logger.component('ChatInterface', 'handleClear called');
    if (window.confirm('Effacer tout l\'historique de conversation ?')) {
      clearChat();
    }
  };

  return (
    <div className="chat-interface">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-title">
          <span className="chat-icon">💬</span>
          <h3>Assistant RAG</h3>
        </div>
        <div className="chat-actions">
          <button
            className="header-btn"
            onClick={handleClear}
            title="Effacer l'historique"
            disabled={messages.length === 0}
          >
            🗑️
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <div className="empty-icon">💭</div>
            <h4>Posez une question</h4>
            <p>
              L'assistant recherchera dans vos documents indexés pour vous fournir une réponse
              avec sources.
            </p>
          </div>
        ) : (
          <MessageList messages={messages} />
        )}
      </div>

      {/* Input */}
      <MessageInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        onCancel={handleCancel}
        isProcessing={isProcessing}
      />
    </div>
  );
};
