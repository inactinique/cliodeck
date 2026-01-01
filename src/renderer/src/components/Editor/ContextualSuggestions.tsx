import React, { useState, useEffect, useCallback } from 'react';
import { Lightbulb, X, BookOpen, Sparkles } from 'lucide-react';
import { useBibliographyStore } from '../../stores/bibliographyStore';
import type { Citation } from '../../stores/bibliographyStore';
import './ContextualSuggestions.css';

interface ContextualSuggestionsProps {
  content: string;
  cursorPosition?: { line: number; column: number };
  suggestionsConfig: {
    enableCitationSuggestions: boolean;
    citationSuggestionDelay: number;
    maxCitationSuggestions: number;
    enableReformulationSuggestions: boolean;
    reformulationDelay: number;
    reformulationMinWords: number;
  };
}

interface CitationSuggestion {
  citation: Citation;
  relevance: number;
  reason: string;
}

export const ContextualSuggestions: React.FC<ContextualSuggestionsProps> = ({
  content,
  cursorPosition,
  suggestionsConfig,
}) => {
  const { citations } = useBibliographyStore();
  const [citationSuggestions, setCitationSuggestions] = useState<CitationSuggestion[]>([]);
  const [reformulationSuggestion, setReformulationSuggestion] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Extract context around cursor (last sentence or paragraph)
  const extractContext = useCallback((text: string): string => {
    const lines = text.split('\n');
    // Get last 2-3 non-empty lines for context
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const contextLines = nonEmptyLines.slice(-3);
    return contextLines.join(' ');
  }, []);

  // Extract keywords from context
  const extractKeywords = useCallback((text: string): string[] => {
    // Remove common words and extract meaningful keywords
    const commonWords = new Set([
      'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'ou', 'mais',
      'donc', 'car', 'ni', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on',
      'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are',
      'were', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
      'ce', 'cette', 'ces', 'qui', 'que', 'dont', 'où', 'dans', 'sur', 'avec',
      'pour', 'par', 'sans', 'sous', 'vers', 'chez'
    ]);

    const words = text
      .toLowerCase()
      .replace(/[^\w\sàâäéèêëïîôùûüÿæœç]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3 && !commonWords.has(word));

    // Count frequency
    const wordCount = new Map<string, number>();
    words.forEach(word => {
      wordCount.set(word, (wordCount.get(word) || 0) + 1);
    });

    // Return top keywords
    return Array.from(wordCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }, []);

  // Calculate relevance score for a citation
  const calculateRelevance = useCallback((citation: Citation, keywords: string[]): { score: number; matchedWords: string[] } => {
    const citationText = `${citation.author} ${citation.title} ${citation.year} ${citation.journal || ''} ${citation.publisher || ''}`.toLowerCase();

    let score = 0;
    const matchedWords: string[] = [];

    keywords.forEach(keyword => {
      if (citationText.includes(keyword)) {
        score += 1;
        matchedWords.push(keyword);
      }
    });

    // Bonus for recent citations (last 5 years)
    const year = parseInt(citation.year);
    if (!isNaN(year) && year >= new Date().getFullYear() - 5) {
      score += 0.5;
    }

    return { score, matchedWords };
  }, []);

  // Generate citation suggestions
  const generateCitationSuggestions = useCallback(() => {
    if (!suggestionsConfig.enableCitationSuggestions || citations.length === 0) {
      setCitationSuggestions([]);
      return;
    }

    const context = extractContext(content);
    if (context.trim().length < 20) {
      setCitationSuggestions([]);
      return;
    }

    const keywords = extractKeywords(context);
    if (keywords.length === 0) {
      setCitationSuggestions([]);
      return;
    }

    // Calculate relevance for each citation
    const scoredCitations = citations
      .map(citation => {
        const { score, matchedWords } = calculateRelevance(citation, keywords);
        return {
          citation,
          relevance: score,
          reason: matchedWords.length > 0
            ? `Correspond à: ${matchedWords.slice(0, 2).join(', ')}`
            : 'Récent',
        };
      })
      .filter(item => item.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, suggestionsConfig.maxCitationSuggestions);

    setCitationSuggestions(scoredCitations);
    setIsVisible(scoredCitations.length > 0);
  }, [content, citations, suggestionsConfig, extractContext, extractKeywords, calculateRelevance]);

  // Generate reformulation suggestions (placeholder for now)
  const generateReformulationSuggestion = useCallback(async () => {
    if (!suggestionsConfig.enableReformulationSuggestions) {
      setReformulationSuggestion(null);
      return;
    }

    const context = extractContext(content);
    const words = context.split(/\s+/).filter(w => w.length > 0);

    if (words.length < suggestionsConfig.reformulationMinWords) {
      setReformulationSuggestion(null);
      return;
    }

    setIsLoading(true);

    try {
      // TODO: Call LLM service for reformulation
      // For now, just a placeholder
      setReformulationSuggestion(null);
    } catch (error) {
      console.error('Failed to generate reformulation:', error);
      setReformulationSuggestion(null);
    } finally {
      setIsLoading(false);
    }
  }, [content, suggestionsConfig, extractContext]);

  // Debounced effect for generating suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      generateCitationSuggestions();
    }, suggestionsConfig.citationSuggestionDelay);

    return () => clearTimeout(timer);
  }, [content, generateCitationSuggestions, suggestionsConfig.citationSuggestionDelay]);

  // Debounced effect for reformulation
  useEffect(() => {
    if (!suggestionsConfig.enableReformulationSuggestions) return;

    const timer = setTimeout(() => {
      generateReformulationSuggestion();
    }, suggestionsConfig.reformulationDelay);

    return () => clearTimeout(timer);
  }, [content, generateReformulationSuggestion, suggestionsConfig]);

  const handleInsertCitation = (citation: Citation) => {
    const citationText = `[@${citation.id}]`;
    window.electron.editor.insertText(citationText);
    setIsVisible(false);
  };

  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible || (citationSuggestions.length === 0 && !reformulationSuggestion)) {
    return null;
  }

  return (
    <div className="contextual-suggestions">
      <div className="suggestions-header">
        <Lightbulb size={16} strokeWidth={1.5} />
        <span className="suggestions-title">Suggestions</span>
        <button className="suggestions-close" onClick={handleClose} title="Fermer">
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div className="suggestions-content">
        {citationSuggestions.length > 0 && (
          <div className="suggestions-section">
            <div className="suggestions-section-title">
              <BookOpen size={14} strokeWidth={1.5} />
              <span>Citations pertinentes</span>
            </div>
            <div className="citation-suggestions">
              {citationSuggestions.map((item, index) => (
                <div
                  key={item.citation.id}
                  className="citation-suggestion"
                  onClick={() => handleInsertCitation(item.citation)}
                  title="Cliquer pour insérer"
                >
                  <div className="citation-suggestion-main">
                    <strong>{item.citation.author}</strong> ({item.citation.year})
                  </div>
                  <div className="citation-suggestion-title">{item.citation.title}</div>
                  <div className="citation-suggestion-reason">{item.reason}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {reformulationSuggestion && (
          <div className="suggestions-section">
            <div className="suggestions-section-title">
              <Sparkles size={14} strokeWidth={1.5} />
              <span>Reformulation suggérée</span>
            </div>
            <div className="reformulation-suggestion">
              {reformulationSuggestion}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="suggestions-loading">
            <span>Analyse en cours...</span>
          </div>
        )}
      </div>
    </div>
  );
};
