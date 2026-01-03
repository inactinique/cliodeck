import React, { useState, useEffect } from 'react';
import { X, Search, Book, AlertCircle, Info } from 'lucide-react';
import methodologyGuide from '../../../../../backend/data/methodology-guide.json';
import './MethodologyModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialFeature?: string; // Pour ouvrir directement sur une feature
}

type ViewMode = 'overview' | 'feature' | 'faq' | 'glossary';

export const MethodologyModal: React.FC<Props> = ({ isOpen, onClose, initialFeature }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedFeature, setSelectedFeature] = useState<string | null>(initialFeature || null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (initialFeature && isOpen) {
      setViewMode('feature');
      setSelectedFeature(initialFeature);
    }
  }, [initialFeature, isOpen]);

  if (!isOpen) return null;

  const features = methodologyGuide.features;
  const faq = methodologyGuide.faq;
  const glossary = methodologyGuide.glossary;

  // Filter FAQ based on search
  const filteredFaq = faq.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter glossary based on search
  const filteredGlossary = Object.entries(glossary).filter(
    ([term, definition]) =>
      term.toLowerCase().includes(searchQuery.toLowerCase()) ||
      definition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderFeatureDetail = (featureKey: string) => {
    const feature = features[featureKey];
    if (!feature) return null;

    return (
      <div className="feature-detail">
        <h2>{feature.title}</h2>
        <p className="feature-description">{feature.description}</p>

        <section className="detail-section">
          <h3>✓ Capacités</h3>
          <ul>
            {feature.capabilities.map((cap, idx) => (
              <li key={idx}>{cap}</li>
            ))}
          </ul>
        </section>

        <section className="detail-section">
          <h3>⚠ Limitations</h3>
          <ul className="limitations-list">
            {feature.limitations.map((lim, idx) => (
              <li key={idx}>{lim}</li>
            ))}
          </ul>
        </section>

        <section className="detail-section">
          <h3>💡 Bonnes Pratiques</h3>
          <ul>
            {feature.bestPractices.map((practice, idx) => (
              <li key={idx}>{practice}</li>
            ))}
          </ul>
        </section>

        <section className="detail-section academic-context">
          <h3>📚 Contexte Académique</h3>
          <p>{feature.academicContext}</p>
        </section>
      </div>
    );
  };

  return (
    <div className="methodology-modal-overlay" onClick={onClose}>
      <div className="methodology-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <Book size={24} />
            <h2>Guide Méthodologique</h2>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <div className="modal-nav">
          <button
            className={viewMode === 'overview' ? 'active' : ''}
            onClick={() => setViewMode('overview')}
          >
            Vue d'ensemble
          </button>
          <button
            className={viewMode === 'feature' ? 'active' : ''}
            onClick={() => {
              setViewMode('feature');
              if (!selectedFeature) setSelectedFeature('chat');
            }}
          >
            Fonctionnalités
          </button>
          <button className={viewMode === 'faq' ? 'active' : ''} onClick={() => setViewMode('faq')}>
            FAQ
          </button>
          <button
            className={viewMode === 'glossary' ? 'active' : ''}
            onClick={() => setViewMode('glossary')}
          >
            Glossaire
          </button>
        </div>

        {/* Search bar (for FAQ and Glossary) */}
        {(viewMode === 'faq' || viewMode === 'glossary') && (
          <div className="search-bar">
            <Search size={16} />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}

        {/* Content */}
        <div className="modal-content">
          {viewMode === 'overview' && (
            <div className="overview">
              <h2>Bienvenue dans mdFocus</h2>
              <p className="intro">
                mdFocus est un outil d'écriture académique assistée par IA, conçu pour les
                chercheurs en sciences humaines. Ce guide vous aide à comprendre les capacités,
                limitations et bonnes pratiques de chaque fonctionnalité.
              </p>

              <div className="alert-box">
                <AlertCircle size={20} />
                <div>
                  <strong>Important :</strong> L'IA est un outil d'exploration et d'assistance,
                  pas un remplacement de votre analyse critique. Vérifiez toujours les sources et
                  documentez votre méthodologie.
                </div>
              </div>

              <h3>Fonctionnalités Principales</h3>
              <div className="feature-cards">
                {Object.entries(features).map(([key, feature]) => (
                  <div
                    key={key}
                    className="feature-card"
                    onClick={() => {
                      setSelectedFeature(key);
                      setViewMode('feature');
                    }}
                  >
                    <h4>{feature.title}</h4>
                    <p>{feature.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'feature' && (
            <div className="feature-view">
              <div className="feature-sidebar">
                <h3>Fonctionnalités</h3>
                {Object.entries(features).map(([key, feature]) => (
                  <button
                    key={key}
                    className={selectedFeature === key ? 'active' : ''}
                    onClick={() => setSelectedFeature(key)}
                  >
                    {feature.title}
                  </button>
                ))}
              </div>
              <div className="feature-content">
                {selectedFeature && renderFeatureDetail(selectedFeature)}
              </div>
            </div>
          )}

          {viewMode === 'faq' && (
            <div className="faq-view">
              <h2>Questions Fréquentes</h2>
              {filteredFaq.length === 0 ? (
                <p className="no-results">Aucun résultat pour "{searchQuery}"</p>
              ) : (
                filteredFaq.map((item, idx) => (
                  <div key={idx} className="faq-item">
                    <h4>{item.question}</h4>
                    <p>{item.answer}</p>
                    <span className="faq-category">{item.category}</span>
                  </div>
                ))
              )}
            </div>
          )}

          {viewMode === 'glossary' && (
            <div className="glossary-view">
              <h2>Glossaire</h2>
              {filteredGlossary.length === 0 ? (
                <p className="no-results">Aucun résultat pour "{searchQuery}"</p>
              ) : (
                filteredGlossary.map(([term, definition]) => (
                  <div key={term} className="glossary-item">
                    <dt>{term}</dt>
                    <dd>{definition}</dd>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
