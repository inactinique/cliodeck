import React from 'react';
import { CollapsibleSection } from '../common/CollapsibleSection';
import type { RAGConfig } from './ConfigPanel';

interface RAGConfigSectionProps {
  config: RAGConfig;
  onChange: (config: RAGConfig) => void;
}

export const RAGConfigSection: React.FC<RAGConfigSectionProps> = ({ config, onChange }) => {

  const handleTopKChange = (value: number) => {
    onChange({ ...config, topK: value });
  };

  const handleThresholdChange = (value: number) => {
    onChange({ ...config, similarityThreshold: value });
  };

  const handleChunkingChange = (value: 'cpuOptimized' | 'standard' | 'large') => {
    onChange({ ...config, chunkingConfig: value });
  };

  const handleSummaryGenerationChange = (value: 'extractive' | 'abstractive' | 'disabled') => {
    onChange({ ...config, summaryGeneration: value });
  };

  const handleSummaryMaxLengthChange = (value: number) => {
    onChange({ ...config, summaryMaxLength: value });
  };

  const handleUseGraphContextChange = (value: boolean) => {
    onChange({ ...config, useGraphContext: value });
  };

  const handleGraphSimilarityThresholdChange = (value: number) => {
    onChange({ ...config, graphSimilarityThreshold: value });
  };

  const handleAdditionalGraphDocsChange = (value: number) => {
    onChange({ ...config, additionalGraphDocs: value });
  };

  const handleIncludeSummariesChange = (value: boolean) => {
    onChange({ ...config, includeSummaries: value });
  };

  const handleEnableTopicModelingChange = (value: boolean) => {
    onChange({ ...config, enableTopicModeling: value });
  };

  return (
    <CollapsibleSection title="Configuration RAG" defaultExpanded={false}>
      <div className="config-section">
        <div className="config-section-content">
          {/* Top K */}
          <div className="config-field">
            <label className="config-label">
              Nombre de chunks (topK)
              <span className="config-help">
                Nombre maximum de chunks récupérés pour répondre à une question
              </span>
            </label>
            <div className="config-input-group">
              <input
                type="range"
                min="1"
                max="20"
                value={config.topK}
                onChange={(e) => handleTopKChange(parseInt(e.target.value))}
                className="config-slider"
              />
              <input
                type="number"
                min="1"
                max="20"
                value={config.topK}
                onChange={(e) => handleTopKChange(parseInt(e.target.value))}
                className="config-number"
              />
            </div>
            <div className="config-description">
              Valeur actuelle: {config.topK} chunks
              <br />
              <small>
                • 1-5: Réponses rapides, contexte limité
                <br />
                • 6-10: Équilibre vitesse/contexte (recommandé)
                <br />
                • 11-20: Maximum de contexte, plus lent
              </small>
            </div>
          </div>

          {/* Similarity Threshold */}
          <div className="config-field">
            <label className="config-label">
              Seuil de similarité
              <span className="config-help">
                Score minimum de similarité pour inclure un chunk (0.0 - 1.0)
              </span>
            </label>
            <div className="config-input-group">
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.similarityThreshold}
                onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
                className="config-slider"
              />
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={config.similarityThreshold}
                onChange={(e) => handleThresholdChange(parseFloat(e.target.value))}
                className="config-number"
              />
            </div>
            <div className="config-description">
              Valeur actuelle: {config.similarityThreshold.toFixed(2)}
              <br />
              <small>
                • 0.0-0.2: Plus de résultats, moins précis
                <br />
                • 0.2-0.4: Équilibre (recommandé)
                <br />
                • 0.4-1.0: Très précis, risque de ne rien trouver
              </small>
            </div>
          </div>

          {/* Chunking Configuration */}
          <div className="config-field">
            <label className="config-label">
              Stratégie de découpage
              <span className="config-help">
                Taille des chunks lors de l'indexation
              </span>
            </label>
            <select
              value={config.chunkingConfig}
              onChange={(e) => handleChunkingChange(e.target.value as any)}
              className="config-select"
            >
              <option value="cpuOptimized">Optimisé CPU (petits chunks, rapide)</option>
              <option value="standard">Standard (équilibré)</option>
              <option value="large">Large (gros chunks, plus de contexte)</option>
            </select>
            <div className="config-description">
              <small>
                ⚠️ Changer cette option nécessite de ré-indexer tous les PDFs
              </small>
            </div>
          </div>

          {/* Summary Generation */}
          <div className="config-field">
            <label className="config-label">
              Génération de résumés
              <span className="config-help">
                Méthode pour générer des résumés de documents
              </span>
            </label>
            <select
              value={config.summaryGeneration}
              onChange={(e) => handleSummaryGenerationChange(e.target.value as any)}
              className="config-select"
            >
              <option value="disabled">Désactivé</option>
              <option value="extractive">Extractif (sélection de phrases clés)</option>
              <option value="abstractive">Abstractif (génération via LLM)</option>
            </select>
            <div className="config-description">
              <small>
                • Extractif: Rapide, sélectionne les phrases importantes
                <br />
                • Abstractif: Plus lent, génère un résumé original (nécessite LLM)
              </small>
            </div>
          </div>

          {/* Summary Max Length - Only shown if summary generation is enabled */}
          {config.summaryGeneration !== 'disabled' && (
            <div className="config-field">
              <label className="config-label">
                Longueur maximale des résumés
                <span className="config-help">
                  Nombre maximum de mots dans le résumé
                </span>
              </label>
              <div className="config-input-group">
                <input
                  type="range"
                  min="100"
                  max="1000"
                  step="50"
                  value={config.summaryMaxLength}
                  onChange={(e) => handleSummaryMaxLengthChange(parseInt(e.target.value))}
                  className="config-slider"
                />
                <input
                  type="number"
                  min="100"
                  max="1000"
                  step="50"
                  value={config.summaryMaxLength}
                  onChange={(e) => handleSummaryMaxLengthChange(parseInt(e.target.value))}
                  className="config-number"
                />
              </div>
              <div className="config-description">
                Valeur actuelle: {config.summaryMaxLength} mots
              </div>
            </div>
          )}

          {/* Use Graph Context */}
          <div className="config-field">
            <label className="config-label">
              Utiliser le graphe de connaissances
              <span className="config-help">
                Enrichir les résultats avec des documents liés (citations, similarité)
              </span>
            </label>
            <div className="config-input-group">
              <input
                type="checkbox"
                checked={config.useGraphContext}
                onChange={(e) => handleUseGraphContextChange(e.target.checked)}
                className="config-checkbox"
              />
              <span>{config.useGraphContext ? 'Activé' : 'Désactivé'}</span>
            </div>
            <div className="config-description">
              <small>
                Active la recherche de documents liés via citations et similarité sémantique
              </small>
            </div>
          </div>

          {/* Additional Graph Docs - Only shown if graph context is enabled */}
          {config.useGraphContext && (
            <>
              <div className="config-field">
                <label className="config-label">
                  Documents liés à inclure
                  <span className="config-help">
                    Nombre de documents liés à ajouter au contexte
                  </span>
                </label>
                <div className="config-input-group">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={config.additionalGraphDocs}
                    onChange={(e) => handleAdditionalGraphDocsChange(parseInt(e.target.value))}
                    className="config-slider"
                  />
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={config.additionalGraphDocs}
                    onChange={(e) => handleAdditionalGraphDocsChange(parseInt(e.target.value))}
                    className="config-number"
                  />
                </div>
                <div className="config-description">
                  Valeur actuelle: {config.additionalGraphDocs} documents
                </div>
              </div>

              <div className="config-field">
                <label className="config-label">
                  Seuil de similarité pour le graphe
                  <span className="config-help">
                    Score minimum de similarité pour inclure un document lié
                  </span>
                </label>
                <div className="config-input-group">
                  <input
                    type="range"
                    min="0.5"
                    max="1"
                    step="0.05"
                    value={config.graphSimilarityThreshold}
                    onChange={(e) => handleGraphSimilarityThresholdChange(parseFloat(e.target.value))}
                    className="config-slider"
                  />
                  <input
                    type="number"
                    min="0.5"
                    max="1"
                    step="0.05"
                    value={config.graphSimilarityThreshold}
                    onChange={(e) => handleGraphSimilarityThresholdChange(parseFloat(e.target.value))}
                    className="config-number"
                  />
                </div>
                <div className="config-description">
                  Valeur actuelle: {config.graphSimilarityThreshold.toFixed(2)}
                </div>
              </div>
            </>
          )}

          {/* Include Summaries in RAG */}
          <div className="config-field">
            <label className="config-label">
              Utiliser résumés dans le RAG
              <span className="config-help">
                Utiliser les résumés au lieu des chunks pour le contexte
              </span>
            </label>
            <div className="config-input-group">
              <input
                type="checkbox"
                checked={config.includeSummaries}
                onChange={(e) => handleIncludeSummariesChange(e.target.checked)}
                className="config-checkbox"
              />
              <span>{config.includeSummaries ? 'Activé' : 'Désactivé'}</span>
            </div>
            <div className="config-description">
              <small>
                Si activé, utilise les résumés de documents au lieu des chunks détaillés
                <br />
                ⚠️ Nécessite que la génération de résumés soit activée
              </small>
            </div>
          </div>

          {/* Topic Modeling */}
          <div className="config-field">
            <label className="config-label">
              Modélisation de topics
              <span className="config-help">
                Activer l'analyse thématique automatique du corpus
              </span>
            </label>
            <div className="config-input-group">
              <input
                type="checkbox"
                checked={config.enableTopicModeling}
                onChange={(e) => handleEnableTopicModelingChange(e.target.checked)}
                className="config-checkbox"
              />
              <span>{config.enableTopicModeling ? 'Activé' : 'Désactivé'}</span>
            </div>
            <div className="config-description">
              <small>
                Active BERTopic pour identifier automatiquement les thèmes du corpus
              </small>
            </div>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  );
};
