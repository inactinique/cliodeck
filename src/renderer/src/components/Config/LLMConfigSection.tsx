import { CollapsibleSection } from '../common/CollapsibleSection';
import React from 'react';
import type { LLMConfig } from './ConfigPanel';

interface LLMConfigSectionProps {
  config: LLMConfig;
  onChange: (config: LLMConfig) => void;
  availableModels: string[];
  onRefreshModels: () => void;
}

export const LLMConfigSection: React.FC<LLMConfigSectionProps> = ({
  config,
  onChange,
  availableModels,
  onRefreshModels,
}) => {

  const handleFieldChange = (field: keyof LLMConfig, value: any) => {
    onChange({ ...config, [field]: value });
  };

  return (
    <CollapsibleSection title="Configuration LLM" defaultExpanded={false}>
      <div className="config-section">
        <div className="config-section-content">
          {/* Ollama URL */}
          <div className="config-field">
            <label className="config-label">
              URL Ollama
              <span className="config-help">
                Adresse du serveur Ollama (local ou distant)
              </span>
            </label>
            <input
              type="text"
              value={config.ollamaURL}
              onChange={(e) => handleFieldChange('ollamaURL', e.target.value)}
              className="config-input"
              placeholder="http://127.0.0.1:11434"
            />
          </div>

          {/* Chat Model */}
          <div className="config-field">
            <label className="config-label">
              Modèle de chat
              <span className="config-help">
                Modèle utilisé pour générer les réponses
              </span>
            </label>
            <div className="config-input-group">
              <input
                type="text"
                value={config.ollamaChatModel}
                onChange={(e) => handleFieldChange('ollamaChatModel', e.target.value)}
                className="config-input"
                placeholder="gemma2:2b"
              />
              <button
                className="config-btn-small"
                onClick={onRefreshModels}
                title="Rafraîchir la liste des modèles"
              >
                🔄
              </button>
            </div>
            <div className="config-description">
              <small>
                Modèles recommandés:
                <br />
                • gemma2:2b (rapide, CPU)
                <br />
                • phi3:mini (équilibré)
                <br />
                • mistral:7b-instruct (qualité, français)
              </small>
            </div>
          </div>

          {/* Embedding Model */}
          <div className="config-field">
            <label className="config-label">
              Modèle d'embeddings
              <span className="config-help">
                Modèle pour convertir le texte en vecteurs
              </span>
            </label>
            <input
              type="text"
              value={config.ollamaEmbeddingModel}
              onChange={(e) => handleFieldChange('ollamaEmbeddingModel', e.target.value)}
              className="config-input"
              placeholder="nomic-embed-text"
            />
            <div className="config-description">
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '4px',
                marginTop: '8px'
              }}>
                <strong>⚠️ Attention :</strong> Changer ce modèle nécessite de ré-indexer tous les PDFs.
                <br />
                <small>
                  Les embeddings ne sont pas compatibles entre modèles différents.
                  <br />
                  Vous devrez supprimer tous les PDFs indexés et les ré-indexer après le changement.
                </small>
              </div>
              <small style={{ display: 'block', marginTop: '8px' }}>
                <strong>Modèles recommandés :</strong>
                <br />
                • <code>nomic-embed-text</code> - 768 dim, multilingue, recommandé
                <br />
                • <code>mxbai-embed-large</code> - 1024 dim, très performant
                <br />
                • <code>all-minilm</code> - 384 dim, léger et rapide
              </small>
            </div>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
};
