import React, { useState, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { CollapsibleSection } from '../common/CollapsibleSection';
import './CorpusExplorerPanel.css';

interface GraphNode {
  id: string;
  type: 'document' | 'author';
  label: string;
  metadata?: {
    title?: string;
    author?: string;
    year?: string;
    pageCount?: number;
  };
  centrality?: number;
  community?: number;
  x?: number;
  y?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  type: 'citation' | 'similarity' | 'co-citation';
  weight: number;
  metadata?: {
    context?: string;
    pageNumber?: number;
  };
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface CorpusStatistics {
  documentCount: number;
  chunkCount: number;
  citationCount: number; // Citations internes (matchées dans le corpus)
  totalCitationsExtracted: number; // Total des citations extraites
  languageCount: number;
  languages: string[];
  yearRange: {
    min: number;
    max: number;
  } | null;
  authorCount: number;
}

interface Topic {
  id: number;
  keywords: string[];
  size: number;
  representative_docs?: string[];
}

interface TopicAnalysisResult {
  topics: Topic[];
  topicAssignments?: Record<string, number>;
  outliers?: string[];
}

export const CorpusExplorerPanel: React.FC = () => {
  const [statistics, setStatistics] = useState<CorpusStatistics | null>(null);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [fullGraphData, setFullGraphData] = useState<GraphData | null>(null);
  const [topicAnalysis, setTopicAnalysis] = useState<TopicAnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null);
  const [numTopics, setNumTopics] = useState<number>(10); // Nombre de topics souhaités

  // Filters
  const [filters, setFilters] = useState({
    year: null as number | null,
    author: null as string | null,
    language: null as string | null,
    topic: null as number | null,
  });

  const graphRef = useRef<any>();

  useEffect(() => {
    loadCorpusData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, fullGraphData]);

  const loadCorpusData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Charger les statistiques
      const statsResult = await window.electron.corpus.getStatistics();
      if (statsResult.success) {
        setStatistics(statsResult.statistics);
      } else {
        console.warn('Failed to load statistics:', statsResult.error);
      }

      // Charger le graphe
      const graphResult = await window.electron.corpus.getGraph({
        includeSimilarityEdges: true,
        similarityThreshold: 0.7,
        includeAuthorNodes: false,
        computeLayout: true,
      });

      if (graphResult.success) {
        setFullGraphData(graphResult.graph);
        setGraphData(graphResult.graph);
      } else {
        throw new Error(graphResult.error || 'Failed to load graph');
      }
    } catch (err: any) {
      console.error('Error loading corpus data:', err);
      setError(err.message || 'Failed to load corpus data');
    } finally {
      setLoading(false);
    }
  };

  const loadTopics = async () => {
    setLoadingTopics(true);
    try {
      const result = await window.electron.corpus.analyzeTopics({
        minTopicSize: 3,
        language: 'multilingual',
        nGramRange: [1, 3],
        nrTopics: numTopics, // Nombre de topics souhaités
      });

      if (result.success) {
        setTopicAnalysis(result);
      } else {
        console.error('Failed to load topics:', result.error);
        alert('Erreur lors de l\'analyse des topics: ' + result.error);
      }
    } catch (err: any) {
      console.error('Error loading topics:', err);
      alert('Erreur lors de l\'analyse des topics: ' + err.message);
    } finally {
      setLoadingTopics(false);
    }
  };

  // Obtenir les documents d'un topic
  const getDocumentsForTopic = (topicId: number): GraphNode[] => {
    if (!topicAnalysis?.topicAssignments || !fullGraphData) return [];

    const docIds = Object.entries(topicAnalysis.topicAssignments)
      .filter(([_, assignedTopicId]) => assignedTopicId === topicId)
      .map(([docId, _]) => docId);

    return fullGraphData.nodes.filter(node => docIds.includes(node.id));
  };

  const applyFilters = () => {
    if (!fullGraphData) return;

    let filteredNodes = [...fullGraphData.nodes];

    // Filter by year
    if (filters.year !== null) {
      filteredNodes = filteredNodes.filter(
        (node) => node.metadata?.year === filters.year?.toString()
      );
    }

    // Filter by author
    if (filters.author !== null) {
      filteredNodes = filteredNodes.filter(
        (node) => node.metadata?.author === filters.author
      );
    }

    // Filter by language
    if (filters.language !== null) {
      filteredNodes = filteredNodes.filter(
        (node) => {
          // Language is stored in the full document data, we'll need to check if it matches
          // For now, we'll skip this filter as it requires additional metadata
          return true;
        }
      );
    }

    // Filter by topic
    if (filters.topic !== null && topicAnalysis?.topicAssignments) {
      const docsInTopic = Object.entries(topicAnalysis.topicAssignments)
        .filter(([_, topicId]) => topicId === filters.topic)
        .map(([docId, _]) => docId);

      filteredNodes = filteredNodes.filter((node) =>
        docsInTopic.includes(node.id)
      );
    }

    // Filter edges to only include those between filtered nodes
    const nodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = fullGraphData.edges.filter(
      (edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );

    setGraphData({
      nodes: filteredNodes,
      edges: filteredEdges,
    });
  };

  const clearFilters = () => {
    setFilters({
      year: null,
      author: null,
      language: null,
      topic: null,
    });
  };

  const getAvailableYears = (): number[] => {
    if (!fullGraphData) return [];
    const years = new Set<number>();
    fullGraphData.nodes.forEach((node) => {
      if (node.metadata?.year) {
        years.add(parseInt(node.metadata.year));
      }
    });
    return Array.from(years).sort((a, b) => a - b);
  };

  const getAvailableAuthors = (): string[] => {
    if (!fullGraphData) return [];
    const authors = new Set<string>();
    fullGraphData.nodes.forEach((node) => {
      if (node.metadata?.author) {
        authors.add(node.metadata.author);
      }
    });
    return Array.from(authors).sort();
  };

  const handleNodeClick = (node: any) => {
    setSelectedNode(node as GraphNode);
  };

  const getNodeColor = (node: GraphNode) => {
    if (node.type === 'author') {
      return '#FFB84D'; // Orange pour auteurs
    }

    // Couleur basée sur la communauté
    if (node.community !== undefined) {
      const colors = ['#4A90E2', '#50C878', '#FF6B6B', '#9B59B6', '#F4A460'];
      return colors[node.community % colors.length];
    }

    return '#4A90E2'; // Bleu par défaut
  };

  const getNodeSize = (node: GraphNode) => {
    // Taille basée sur la centralité
    if (node.centrality !== undefined) {
      return Math.max(4, Math.min(12, 4 + node.centrality * 2));
    }
    return 6;
  };

  const getEdgeColor = (edge: GraphEdge) => {
    switch (edge.type) {
      case 'citation':
        return '#FF6B6B'; // Rouge pour citations
      case 'similarity':
        return '#50C878'; // Vert pour similarité
      case 'co-citation':
        return '#9B59B6'; // Violet pour co-citations
      default:
        return '#CCCCCC';
    }
  };

  if (loading) {
    return (
      <div className="corpus-explorer-panel">
        <div className="corpus-loading">
          <div className="loading-spinner"></div>
          <p>Chargement du corpus...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="corpus-explorer-panel">
        <div className="corpus-error">
          <h3>Erreur</h3>
          <p>{error}</p>
          <button onClick={loadCorpusData}>Réessayer</button>
        </div>
      </div>
    );
  }

  if (!statistics || !graphData || graphData.nodes.length === 0) {
    return (
      <div className="corpus-explorer-panel">
        <div className="corpus-empty">
          <div className="empty-icon">📊</div>
          <h3>Corpus vide</h3>
          <p>
            Indexez au moins 2 documents PDF pour visualiser le graphe de connaissances.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="corpus-explorer-panel">
      {/* Filtres */}
      <CollapsibleSection title="Filtres" defaultExpanded={false}>
        <div className="filters-container">
          <div className="filter-group">
            <label>Année:</label>
            <select
              value={filters.year || ''}
              onChange={(e) => setFilters({ ...filters, year: e.target.value ? parseInt(e.target.value) : null })}
            >
              <option value="">Toutes</option>
              {getAvailableYears().map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Auteur:</label>
            <select
              value={filters.author || ''}
              onChange={(e) => setFilters({ ...filters, author: e.target.value || null })}
            >
              <option value="">Tous</option>
              {getAvailableAuthors().map((author) => (
                <option key={author} value={author}>
                  {author}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Langue:</label>
            <select
              value={filters.language || ''}
              onChange={(e) => setFilters({ ...filters, language: e.target.value || null })}
            >
              <option value="">Toutes</option>
              {(statistics?.languages || []).map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Topic:</label>
            <select
              value={filters.topic !== null ? filters.topic : ''}
              onChange={(e) => setFilters({ ...filters, topic: e.target.value ? parseInt(e.target.value) : null })}
              disabled={!topicAnalysis}
            >
              <option value="">Tous</option>
              {(topicAnalysis?.topics || []).map((topic) => (
                <option key={topic.id} value={topic.id}>
                  Topic {topic.id}: {topic.keywords.slice(0, 3).join(', ')}
                </option>
              ))}
            </select>
          </div>

          <button onClick={clearFilters} className="clear-filters-btn">
            Réinitialiser filtres
          </button>
        </div>
      </CollapsibleSection>

      {/* Statistiques globales */}
      <CollapsibleSection title="Statistiques" defaultExpanded={true}>
        <div className="corpus-stats">
          <div className="stat-card">
            <div className="stat-value">{statistics.documentCount}</div>
            <div className="stat-label">Documents</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{statistics.totalCitationsExtracted}</div>
            <div className="stat-label">Citations extraites</div>
            <div className="stat-detail">
              {statistics.citationCount} internes ({Math.round((statistics.citationCount / Math.max(statistics.totalCitationsExtracted, 1)) * 100)}%)
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{statistics.authorCount}</div>
            <div className="stat-label">Auteurs</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{statistics.languageCount}</div>
            <div className="stat-label">Langues</div>
          </div>
        </div>

        {statistics.yearRange && (
          <div className="stat-info">
            <span className="stat-info-label">Période:</span>
            <span className="stat-info-value">
              {statistics.yearRange.min} - {statistics.yearRange.max}
            </span>
          </div>
        )}

        {statistics.languages && statistics.languages.length > 0 && (
          <div className="stat-info">
            <span className="stat-info-label">Langues:</span>
            <span className="stat-info-value">
              {statistics.languages.join(', ')}
            </span>
          </div>
        )}
      </CollapsibleSection>

      {/* Topics */}
      <CollapsibleSection title="Analyse thématique (BERTopic)" defaultExpanded={false}>
        {!topicAnalysis ? (
          <div className="topics-empty">
            <p>Aucune analyse thématique disponible.</p>
            <div className="topics-config">
              <label>
                Nombre de topics:
                <input
                  type="number"
                  min="2"
                  max="50"
                  value={numTopics}
                  onChange={(e) => setNumTopics(parseInt(e.target.value) || 10)}
                  className="topics-number-input"
                />
              </label>
            </div>
            <button onClick={loadTopics} disabled={loadingTopics} className="load-topics-btn">
              {loadingTopics ? 'Analyse en cours...' : 'Analyser les topics'}
            </button>
            <p className="topics-help">
              L'analyse thématique nécessite au moins 5 documents indexés.
            </p>
          </div>
        ) : (
          <div className="topics-list">
            <div className="topics-header">
              <span>{topicAnalysis.topics?.length || 0} topics identifiés</span>
              <button onClick={loadTopics} disabled={loadingTopics} className="reload-topics-btn">
                {loadingTopics ? 'Analyse...' : 'Réanalyser'}
              </button>
            </div>
            {(topicAnalysis.topics || []).map((topic) => {
              const topicDocs = getDocumentsForTopic(topic.id);
              const isExpanded = expandedTopic === topic.id;

              return (
                <div
                  key={topic.id}
                  className={`topic-card ${filters.topic === topic.id ? 'topic-selected' : ''} ${isExpanded ? 'topic-expanded' : ''}`}
                >
                  <div
                    className="topic-header"
                    onClick={() => setFilters({ ...filters, topic: filters.topic === topic.id ? null : topic.id })}
                  >
                    <span className="topic-id">Topic {topic.id}</span>
                    <span className="topic-size">{topic.size} documents</span>
                  </div>
                  <div className="topic-keywords">
                    {topic.keywords.slice(0, 5).map((keyword, idx) => (
                      <span key={idx} className="topic-keyword">
                        {keyword}
                      </span>
                    ))}
                  </div>
                  <button
                    className="topic-expand-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedTopic(isExpanded ? null : topic.id);
                    }}
                  >
                    {isExpanded ? '▼ Masquer documents' : `▶ Voir ${topicDocs.length} documents`}
                  </button>

                  {isExpanded && (
                    <div className="topic-documents">
                      {topicDocs.map((doc) => (
                        <div key={doc.id} className="topic-document-item">
                          <span className="doc-title">{doc.metadata?.title || doc.label}</span>
                          {doc.metadata?.author && (
                            <span className="doc-author"> - {doc.metadata.author}</span>
                          )}
                          {doc.metadata?.year && (
                            <span className="doc-year"> ({doc.metadata.year})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleSection>

      {/* Graphe de connaissances */}
      <CollapsibleSection title="Graphe de connaissances" defaultExpanded={true}>
        <div className="graph-container">
          <div className="graph-legend">
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#FF6B6B' }}></span>
              <span>Citations</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#50C878' }}></span>
              <span>Similarité</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#9B59B6' }}></span>
              <span>Co-citations</span>
            </div>
          </div>

          <div className="graph-visualization">
            <ForceGraph2D
              ref={graphRef}
              graphData={{
                nodes: graphData.nodes,
                links: graphData.edges, // ForceGraph2D expects 'links' not 'edges'
              }}
              nodeLabel={(node: any) => {
                const n = node as GraphNode;
                return n.metadata?.title || n.label;
              }}
              nodeColor={(node: any) => getNodeColor(node as GraphNode)}
              nodeVal={(node: any) => getNodeSize(node as GraphNode)}
              linkColor={(link: any) => getEdgeColor(link as GraphEdge)}
              linkWidth={(link: any) => {
                const edge = link as GraphEdge;
                return edge.weight || 1;
              }}
              linkDirectionalArrowLength={(link: any) => {
                const edge = link as GraphEdge;
                return edge.type === 'citation' ? 4 : 0; // Flèches uniquement pour citations
              }}
              linkDirectionalArrowRelPos={1}
              onNodeClick={handleNodeClick}
              enableNodeDrag={true}
              enableZoomPanInteraction={true}
              d3AlphaDecay={0.02}
              d3VelocityDecay={0.3}
            />
          </div>

          {selectedNode && (
            <div className="node-details">
              <h4>Détails du nœud</h4>
              <div className="node-info">
                <div className="node-info-row">
                  <span className="node-info-label">Titre:</span>
                  <span className="node-info-value">
                    {selectedNode.metadata?.title || selectedNode.label}
                  </span>
                </div>
                {selectedNode.metadata?.author && (
                  <div className="node-info-row">
                    <span className="node-info-label">Auteur:</span>
                    <span className="node-info-value">{selectedNode.metadata.author}</span>
                  </div>
                )}
                {selectedNode.metadata?.year && (
                  <div className="node-info-row">
                    <span className="node-info-label">Année:</span>
                    <span className="node-info-value">{selectedNode.metadata.year}</span>
                  </div>
                )}
                {selectedNode.centrality !== undefined && (
                  <div className="node-info-row">
                    <span className="node-info-label">Centralité:</span>
                    <span className="node-info-value">
                      {selectedNode.centrality.toFixed(2)}
                    </span>
                  </div>
                )}
                {selectedNode.community !== undefined && (
                  <div className="node-info-row">
                    <span className="node-info-label">Communauté:</span>
                    <span className="node-info-value">{selectedNode.community}</span>
                  </div>
                )}
              </div>
              <button onClick={() => setSelectedNode(null)}>Fermer</button>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Info sur le graphe */}
      <div className="graph-info">
        <div className="graph-info-item">
          <span className="graph-info-label">Nœuds:</span>
          <span className="graph-info-value">{graphData.nodes.length}</span>
        </div>
        <div className="graph-info-item">
          <span className="graph-info-label">Liens:</span>
          <span className="graph-info-value">{graphData.edges.length}</span>
        </div>
      </div>
    </div>
  );
};
