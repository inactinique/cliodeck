import React from 'react';

export interface SuggestionsConfig {
  // Citation suggestions
  enableCitationSuggestions: boolean;
  citationSuggestionDelay: number; // milliseconds before showing suggestions
  maxCitationSuggestions: number;

  // LLM-based reformulation suggestions
  enableReformulationSuggestions: boolean;
  reformulationDelay: number; // milliseconds before triggering LLM
  reformulationMinWords: number; // minimum words to trigger reformulation

  // General settings
  showSuggestionsInline: boolean; // Show inline vs in sidebar
}

interface SuggestionsConfigSectionProps {
  config: SuggestionsConfig;
  onChange: (config: SuggestionsConfig) => void;
}

export const SuggestionsConfigSection: React.FC<SuggestionsConfigSectionProps> = ({
  config,
  onChange,
}) => {
  const handleChange = (key: keyof SuggestionsConfig, value: boolean | number) => {
    onChange({
      ...config,
      [key]: value,
    });
  };

  return (
    <div className="config-section">
      <h3 className="config-section-title">Suggestions Contextuelles</h3>
      <p className="config-section-description">
        Configurez les suggestions intelligentes pendant l'écriture
      </p>

      <div className="config-group">
        <h4 className="config-group-title">Suggestions de Citations</h4>

        <div className="config-item">
          <label className="config-label">
            <input
              type="checkbox"
              checked={config.enableCitationSuggestions}
              onChange={(e) => handleChange('enableCitationSuggestions', e.target.checked)}
            />
            <span>Activer les suggestions de citations</span>
          </label>
          <p className="config-hint">
            Suggère automatiquement des citations pertinentes basées sur le contexte
          </p>
        </div>

        {config.enableCitationSuggestions && (
          <>
            <div className="config-item">
              <label className="config-label">
                Délai avant suggestion (ms)
                <input
                  type="number"
                  value={config.citationSuggestionDelay}
                  onChange={(e) => handleChange('citationSuggestionDelay', parseInt(e.target.value))}
                  min={0}
                  max={5000}
                  step={100}
                  className="config-input"
                />
              </label>
              <p className="config-hint">
                Temps d'attente après la frappe avant d'afficher les suggestions (500ms recommandé)
              </p>
            </div>

            <div className="config-item">
              <label className="config-label">
                Nombre maximum de suggestions
                <input
                  type="number"
                  value={config.maxCitationSuggestions}
                  onChange={(e) => handleChange('maxCitationSuggestions', parseInt(e.target.value))}
                  min={1}
                  max={10}
                  className="config-input"
                />
              </label>
              <p className="config-hint">
                Nombre de citations à suggérer (3-5 recommandé)
              </p>
            </div>
          </>
        )}
      </div>

      <div className="config-group">
        <h4 className="config-group-title">Suggestions de Reformulation (IA)</h4>

        <div className="config-item">
          <label className="config-label">
            <input
              type="checkbox"
              checked={config.enableReformulationSuggestions}
              onChange={(e) => handleChange('enableReformulationSuggestions', e.target.checked)}
            />
            <span>Activer les suggestions de reformulation</span>
          </label>
          <p className="config-hint">
            Utilise l'IA pour suggérer des reformulations de vos phrases (nécessite Ollama)
          </p>
        </div>

        {config.enableReformulationSuggestions && (
          <>
            <div className="config-item">
              <label className="config-label">
                Délai avant analyse (ms)
                <input
                  type="number"
                  value={config.reformulationDelay}
                  onChange={(e) => handleChange('reformulationDelay', parseInt(e.target.value))}
                  min={1000}
                  max={10000}
                  step={500}
                  className="config-input"
                />
              </label>
              <p className="config-hint">
                Temps d'attente avant d'analyser le texte (2000ms recommandé pour éviter les appels fréquents)
              </p>
            </div>

            <div className="config-item">
              <label className="config-label">
                Mots minimum pour déclencher
                <input
                  type="number"
                  value={config.reformulationMinWords}
                  onChange={(e) => handleChange('reformulationMinWords', parseInt(e.target.value))}
                  min={5}
                  max={50}
                  className="config-input"
                />
              </label>
              <p className="config-hint">
                Nombre minimum de mots dans la phrase pour déclencher les suggestions
              </p>
            </div>
          </>
        )}
      </div>

      <div className="config-group">
        <h4 className="config-group-title">Affichage</h4>

        <div className="config-item">
          <label className="config-label">
            <input
              type="checkbox"
              checked={config.showSuggestionsInline}
              onChange={(e) => handleChange('showSuggestionsInline', e.target.checked)}
            />
            <span>Afficher les suggestions en ligne</span>
          </label>
          <p className="config-hint">
            Si désactivé, les suggestions apparaîtront dans un panneau latéral
          </p>
        </div>
      </div>
    </div>
  );
};
