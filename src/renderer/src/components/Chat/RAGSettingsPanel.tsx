import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { useRAGQueryStore } from '../../stores/ragQueryStore';
import './RAGSettingsPanel.css';

export const RAGSettingsPanel: React.FC = () => {
  const {
    params,
    availableModels,
    isLoadingModels,
    isSettingsPanelOpen,
    setParams,
    resetToDefaults,
    toggleSettingsPanel,
    loadAvailableModels,
  } = useRAGQueryStore();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const hasTriedLoading = useRef(false);

  // Auto-retry loading models when panel becomes visible
  useEffect(() => {
    if (isSettingsPanelOpen && availableModels.length === 0 && !isLoadingModels && !hasTriedLoading.current) {
      hasTriedLoading.current = true;
      console.log('🔄 Auto-loading models because panel is open and no models available...');
      loadAvailableModels();
    }
  }, [isSettingsPanelOpen, availableModels.length, isLoadingModels]);

  // Reload models when panel opens (always try if no models loaded)
  const handleTogglePanel = () => {
    toggleSettingsPanel();

    // Try loading models when opening the panel if none are available
    if (!isSettingsPanelOpen && availableModels.length === 0) {
      // Small delay to ensure panel animation has started
      setTimeout(() => {
        loadAvailableModels();
      }, 100);
    }
  };

  const handleResetDefaults = async () => {
    await resetToDefaults();
  };

  const handleRefreshModels = () => {
    hasTriedLoading.current = false; // Reset flag to allow retry
    loadAvailableModels();
  };

  return (
    <div className="rag-settings-panel">
      <button className="settings-toggle" onClick={handleTogglePanel}>
        <span>⚙️ RAG Settings</span>
        {isSettingsPanelOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isSettingsPanelOpen && (
        <div className="settings-content">
          {/* Model Selection */}
          <div className="setting-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <label htmlFor="model-select">
                Model
                {isLoadingModels && <span className="loading-indicator"> (loading...)</span>}
              </label>
              <button
                onClick={handleRefreshModels}
                disabled={isLoadingModels}
                style={{
                  padding: '4px 8px',
                  fontSize: '11px',
                  background: 'var(--surface-variant)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '3px',
                  cursor: isLoadingModels ? 'not-allowed' : 'pointer',
                  opacity: isLoadingModels ? 0.5 : 1,
                }}
              >
                🔄 Refresh
              </button>
            </div>
            <select
              id="model-select"
              value={params.model}
              onChange={(e) => setParams({ model: e.target.value })}
              disabled={isLoadingModels}
            >
              {availableModels.length === 0 && !isLoadingModels ? (
                <option value={params.model}>{params.model} (current)</option>
              ) : (
                availableModels.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} ({model.size})
                  </option>
                ))
              )}
            </select>
            <small className="setting-hint">
              {availableModels.length === 0 && !isLoadingModels
                ? '⚠️ No models loaded. Load a project first, then click Refresh.'
                : `${availableModels.length} models available. Larger models are slower but better.`}
            </small>
          </div>

          {/* Top K */}
          <div className="setting-group">
            <label htmlFor="topk-slider">
              Sources (Top-K): <strong>{params.topK}</strong>
            </label>
            <input
              id="topk-slider"
              type="range"
              min="5"
              max="30"
              step="1"
              value={params.topK}
              onChange={(e) => setParams({ topK: parseInt(e.target.value) })}
            />
            <small className="setting-hint">Number of document chunks to retrieve</small>
          </div>

          {/* Timeout */}
          <div className="setting-group">
            <label htmlFor="timeout-slider">
              Timeout: <strong>{Math.floor(params.timeout / 60000)} min</strong>
            </label>
            <input
              id="timeout-slider"
              type="range"
              min="60000"
              max="900000"
              step="60000"
              value={params.timeout}
              onChange={(e) => setParams({ timeout: parseInt(e.target.value) })}
            />
            <small className="setting-hint">Maximum wait time for response</small>
          </div>

          {/* Advanced Settings Toggle */}
          <button
            className="advanced-toggle"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            <span>{showAdvanced ? '▼' : '▶'} Advanced Parameters</span>
          </button>

          {showAdvanced && (
            <div className="advanced-settings">
              {/* System Prompt Language */}
              <div className="setting-group">
                <label htmlFor="system-prompt-lang">System Prompt Language</label>
                <select
                  id="system-prompt-lang"
                  value={params.systemPromptLanguage}
                  onChange={(e) => setParams({ systemPromptLanguage: e.target.value as 'fr' | 'en' })}
                >
                  <option value="fr">🇫🇷 French (Français)</option>
                  <option value="en">🇬🇧 English</option>
                </select>
                <small className="setting-hint">
                  Language for the default system prompt (instructs the AI how to respond)
                </small>
              </div>

              {/* Custom System Prompt Toggle */}
              <div className="setting-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={params.useCustomSystemPrompt}
                    onChange={(e) => setParams({ useCustomSystemPrompt: e.target.checked })}
                  />
                  <span>Use Custom System Prompt</span>
                </label>
                <small className="setting-hint">
                  Override the default system prompt with a custom one
                </small>
              </div>

              {/* Custom System Prompt Textarea */}
              {params.useCustomSystemPrompt && (
                <div className="setting-group">
                  <label htmlFor="custom-prompt">Custom System Prompt</label>
                  <textarea
                    id="custom-prompt"
                    rows={6}
                    value={params.customSystemPrompt || ''}
                    onChange={(e) => setParams({ customSystemPrompt: e.target.value })}
                    placeholder="Enter your custom system prompt here..."
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '12px',
                      fontFamily: 'monospace',
                      resize: 'vertical',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      background: 'var(--surface-variant)',
                      color: 'var(--text-color)',
                    }}
                  />
                  <small className="setting-hint">
                    This prompt instructs the AI how to respond to your queries
                  </small>
                </div>
              )}

              {/* Temperature */}
              <div className="setting-group">
                <label htmlFor="temperature-slider">
                  Temperature: <strong>{params.temperature.toFixed(2)}</strong>
                </label>
                <input
                  id="temperature-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={params.temperature}
                  onChange={(e) => setParams({ temperature: parseFloat(e.target.value) })}
                />
                <small className="setting-hint">
                  Lower = more focused, higher = more creative
                </small>
              </div>

              {/* Top P */}
              <div className="setting-group">
                <label htmlFor="topp-slider">
                  Top-P: <strong>{params.top_p.toFixed(2)}</strong>
                </label>
                <input
                  id="topp-slider"
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={params.top_p}
                  onChange={(e) => setParams({ top_p: parseFloat(e.target.value) })}
                />
                <small className="setting-hint">Nucleus sampling threshold</small>
              </div>

              {/* Top K (LLM parameter, different from search topK) */}
              <div className="setting-group">
                <label htmlFor="llm-topk-slider">
                  Top-K (LLM): <strong>{params.top_k}</strong>
                </label>
                <input
                  id="llm-topk-slider"
                  type="range"
                  min="1"
                  max="100"
                  step="1"
                  value={params.top_k}
                  onChange={(e) => setParams({ top_k: parseInt(e.target.value) })}
                />
                <small className="setting-hint">Number of tokens to consider</small>
              </div>

              {/* Repeat Penalty */}
              <div className="setting-group">
                <label htmlFor="repeat-penalty-slider">
                  Repeat Penalty: <strong>{params.repeat_penalty.toFixed(2)}</strong>
                </label>
                <input
                  id="repeat-penalty-slider"
                  type="range"
                  min="1"
                  max="2"
                  step="0.05"
                  value={params.repeat_penalty}
                  onChange={(e) =>
                    setParams({ repeat_penalty: parseFloat(e.target.value) })
                  }
                />
                <small className="setting-hint">Penalize repetitive text</small>
              </div>
            </div>
          )}

          {/* Reset Button */}
          <button className="reset-button" onClick={handleResetDefaults}>
            <RotateCcw size={14} />
            <span>Reset to Config Defaults</span>
          </button>
        </div>
      )}
    </div>
  );
};
