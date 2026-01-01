import React, { useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { useBibliographyStore } from '../../stores/bibliographyStore';
import { useEditorStore } from '../../stores/editorStore';
import './CitationSuggestionsPanel.css';

interface CitationSuggestion {
  id: string;
  author: string;
  year: string;
  title: string;
  relevance: number;
  reason: string;
}

export const CitationSuggestionsPanel: React.FC = () => {
  const { citations } = useBibliographyStore();
  const { content, insertFormatting } = useEditorStore();
  const [suggestions, setSuggestions] = useState<CitationSuggestion[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Extract keywords from the current paragraph/context
  const extractKeywords = (text: string): string[] => {
    // Get last 200 characters around cursor (simplified - in real impl would use cursor position)
    const recentText = text.slice(-200).toLowerCase();

    // French common words to exclude
    const stopWords = new Set([
      'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'mais',
      'dans', 'par', 'pour', 'sur', 'avec', 'sans', 'sous', 'ce', 'cette',
      'ces', 'son', 'sa', 'ses', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes',
      'qui', 'que', 'quoi', 'dont', 'où', 'il', 'elle', 'on', 'nous', 'vous',
      'ils', 'elles', 'être', 'avoir', 'faire', 'dire', 'aller', 'voir',
    ]);

    // Extract words (3+ chars, not in stopwords)
    const words = recentText
      .replace(/[^\w\sàâäéèêëïîôùûüÿæœç]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word));

    // Return top 5 most frequent
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  };

  // Calculate relevance score for a citation
  const calculateRelevance = (citation: any, keywords: string[]): { score: number; reason: string } => {
    let score = 0;
    const reasons: string[] = [];

    const searchText = `${citation.title} ${citation.author} ${citation.abstract || ''} ${citation.keywords || ''}`.toLowerCase();

    keywords.forEach(keyword => {
      if (searchText.includes(keyword)) {
        score += 10;
        reasons.push(keyword);
      }
    });

    // Bonus for recent citations (last 5 years)
    const year = parseInt(citation.year);
    if (year >= new Date().getFullYear() - 5) {
      score += 5;
    }

    const reason = reasons.length > 0
      ? `Mots-clés: ${reasons.slice(0, 3).join(', ')}`
      : 'Source récente';

    return { score, reason };
  };

  // Refresh suggestions based on current context
  const handleRefresh = () => {
    setIsRefreshing(true);

    setTimeout(() => {
      const keywords = extractKeywords(content);

      if (keywords.length === 0 || citations.length === 0) {
        setSuggestions([]);
        setIsRefreshing(false);
        return;
      }

      // Score all citations
      const scoredCitations = citations.map(citation => {
        const { score, reason } = calculateRelevance(citation, keywords);
        return {
          id: citation.id,
          author: citation.author,
          year: citation.year,
          title: citation.title,
          relevance: score,
          reason,
        };
      });

      // Sort by relevance and take top 5
      const topSuggestions = scoredCitations
        .filter(s => s.relevance > 0)
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 5);

      setSuggestions(topSuggestions);
      setIsRefreshing(false);
    }, 500); // Small delay to show loading state
  };

  // Insert citation into editor
  const handleInsertCitation = (citationId: string) => {
    const { content: currentContent } = useEditorStore.getState();
    const newContent = currentContent + `[@${citationId}]`;
    useEditorStore.getState().setContent(newContent);
  };

  return (
    <div className="citation-suggestions-panel">
      <div className="suggestions-header">
        <h3>Suggestions de citations</h3>
        <button
          className="refresh-btn"
          onClick={handleRefresh}
          disabled={isRefreshing}
          title="Rafraîchir les suggestions"
        >
          <RefreshCw size={16} className={isRefreshing ? 'spinning' : ''} />
        </button>
      </div>

      <div className="suggestions-content">
        {suggestions.length === 0 ? (
          <div className="suggestions-empty">
            <p>Aucune suggestion disponible.</p>
            <p className="suggestions-hint">
              Cliquez sur <RefreshCw size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> pour obtenir des suggestions basées sur votre texte.
            </p>
          </div>
        ) : (
          <div className="suggestions-list">
            {suggestions.map(suggestion => (
              <div key={suggestion.id} className="suggestion-card">
                <div className="suggestion-header">
                  <span className="suggestion-author">{suggestion.author}</span>
                  <span className="suggestion-year">({suggestion.year})</span>
                </div>
                <div className="suggestion-title">{suggestion.title}</div>
                <div className="suggestion-reason">{suggestion.reason}</div>
                <button
                  className="suggestion-insert-btn"
                  onClick={() => handleInsertCitation(suggestion.id)}
                  title="Insérer cette citation"
                >
                  Insérer [@{suggestion.id}]
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="suggestions-footer">
        <small>
          {citations.length} source{citations.length > 1 ? 's' : ''} dans la bibliographie
        </small>
      </div>
    </div>
  );
};
