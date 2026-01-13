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
              <small>
                ⚠️ Changer ce modèle nécessite de ré-indexer tous les PDFs
                <br />
                Recommandé: nomic-embed-text (768 dimensions, multilingue)
              </small>
            </div>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
};
