import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { useChatStore } from '../../stores/chatStore';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { RAGSettingsPanel } from './RAGSettingsPanel';
import { HelperTooltip } from '../Methodology/HelperTooltip';
import './ChatInterface.css';
import { logger } from '../../utils/logger';

export const ChatInterface: React.FC = () => {
  const { t } = useTranslation('common');
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
    if (window.confirm(t('chat.clearConfirm'))) {
      clearChat();
    }
  };

  const handleLearnMore = () => {
    window.dispatchEvent(new CustomEvent('show-methodology-modal', { detail: { feature: 'chat' } }));
  };

  return (
    <div className="chat-interface">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-title">
          <h3>Assistant IA</h3>
          <HelperTooltip
            content="L'assistant utilise RAG pour rechercher dans vos PDFs indexés et répondre avec des sources précises."
            onLearnMore={handleLearnMore}
          />
        </div>
        <button
          className="toolbar-btn"
          onClick={handleClear}
          title={t('chat.clearHistory')}
          disabled={messages.length === 0}
        >
          <Trash2 size={20} strokeWidth={1} />
        </button>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            <h4>{t('chat.askQuestion')}</h4>
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

      {/* RAG Settings Panel */}
      <RAGSettingsPanel />
    </div>
  );
};
