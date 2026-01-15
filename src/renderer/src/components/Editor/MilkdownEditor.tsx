import { useEffect, useRef, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Crepe } from '@milkdown/crepe';
import { editorViewCtx } from '@milkdown/kit/core';
import { useEditorStore } from '../../stores/editorStore';
import { useBibliographyStore } from '../../stores/bibliographyStore';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/nord-dark.css';
import './MilkdownEditor.css';

// Citation autocomplete component
const CitationAutocomplete: React.FC<{
  query: string;
  position: { top: number; left: number };
  onSelect: (citationId: string) => void;
  onClose: () => void;
}> = ({ query, position, onSelect, onClose }) => {
  const { t } = useTranslation('common');
  const { citations } = useBibliographyStore();
  const menuRef = useRef<HTMLDivElement>(null);

  // Filter citations based on query
  const filteredCitations = citations.filter((citation) => {
    const searchText = query.toLowerCase();
    return (
      citation.id.toLowerCase().includes(searchText) ||
      citation.author.toLowerCase().includes(searchText) ||
      citation.title.toLowerCase().includes(searchText) ||
      citation.year.includes(searchText)
    );
  }).slice(0, 10);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  if (filteredCitations.length === 0) {
    return (
      <div
        ref={menuRef}
        className="citation-autocomplete-menu"
        style={{ top: position.top, left: position.left }}
      >
        <div className="citation-autocomplete-empty">
          {t('milkdownEditor.noCitationFound')}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="citation-autocomplete-menu"
      style={{ top: position.top, left: position.left }}
    >
      {filteredCitations.map((citation) => (
        <button
          key={citation.id}
          className="citation-autocomplete-item"
          onClick={() => onSelect(citation.id)}
        >
          <span className="citation-key">@{citation.id}</span>
          <span className="citation-info">
            {citation.author} ({citation.year})
          </span>
          <span className="citation-title">{citation.title}</span>
        </button>
      ))}
    </div>
  );
};

export const MilkdownEditor: React.FC = () => {
  const { t } = useTranslation('common');
  const { content, filePath, setContent, settings } = useEditorStore();
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const isInternalUpdate = useRef(false);
  const contentRef = useRef(content); // Store content in ref to avoid re-renders
  const [isEditorReady, setIsEditorReady] = useState(false);

  // Citation autocomplete state
  const [showCitationMenu, setShowCitationMenu] = useState(false);
  const [citationQuery, setCitationQuery] = useState('');
  const [citationMenuPosition, setCitationMenuPosition] = useState({ top: 0, left: 0 });
  const citationStartPos = useRef<number | null>(null);

  // Keep contentRef in sync for when we need to create a new editor
  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  // Safe editor action wrapper
  const safeEditorAction = useCallback((action: (ctx: Parameters<Parameters<NonNullable<typeof crepeRef.current>['editor']['action']>[0]>[0]) => void) => {
    const crepe = crepeRef.current;
    if (!crepe?.editor || !isEditorReady) return false;

    try {
      crepe.editor.action(action);
      return true;
    } catch (error) {
      console.warn('[MilkdownEditor] Editor action failed:', error);
      return false;
    }
  }, [isEditorReady]);

  // Initialize Crepe editor - recreate only when filePath changes
  useEffect(() => {
    if (!editorContainerRef.current) return;

    setIsEditorReady(false);

    // Destroy existing editor if any
    if (crepeRef.current) {
      console.log('[MilkdownEditor] Destroying old editor for new file');
      crepeRef.current.destroy();
      crepeRef.current = null;
    }

    console.log('[MilkdownEditor] Initializing Crepe editor for file:', filePath);

    // Use contentRef.current to get the latest content without adding it as dependency
    const welcomeText = `# ${t('milkdownEditor.welcome')}\n\n${t('milkdownEditor.startWriting')}`;
    const placeholderText = t('milkdownEditor.placeholder');
    const crepe = new Crepe({
      root: editorContainerRef.current,
      defaultValue: contentRef.current || welcomeText,
      featureConfigs: {
        [Crepe.Feature.Placeholder]: {
          text: placeholderText,
        },
      },
    });

    crepe.on((listener) => {
      listener.markdownUpdated((_ctx, markdown, prevMarkdown) => {
        if (markdown !== prevMarkdown) {
          isInternalUpdate.current = true;
          setContent(markdown);
          // Reset after a short delay to allow state to settle
          setTimeout(() => {
            isInternalUpdate.current = false;
          }, 50);
        }
      });
    });

    crepe.create().then(() => {
      console.log('[MilkdownEditor] Crepe editor created successfully');
      crepeRef.current = crepe;
      // Store the editor for external access
      useEditorStore.setState({ milkdownEditor: crepe.editor });
      // Mark editor as ready after a short delay to ensure context is fully initialized
      setTimeout(() => {
        setIsEditorReady(true);
        console.log('[MilkdownEditor] Editor is now ready');
      }, 100);
    }).catch((err) => {
      console.error('[MilkdownEditor] Failed to create editor:', err);
    });

    return () => {
      console.log('[MilkdownEditor] Destroying Crepe editor on unmount');
      setIsEditorReady(false);
      crepe.destroy();
      crepeRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath, setContent, t]); // Only recreate when filePath changes, NOT when content changes

  // Handle IPC text insertion from bibliography panel
  useEffect(() => {
    const handler = (text: string) => {
      safeEditorAction((ctx) => {
        const view = ctx.get(editorViewCtx);
        const { state } = view;
        const { tr, selection } = state;
        tr.insertText(text, selection.from, selection.to);
        view.dispatch(tr);
        view.focus();
      });
    };

    const cleanup = window.electron.editor.onInsertText(handler);
    return cleanup;
  }, [safeEditorAction]);

  // Handle citation autocomplete detection
  useEffect(() => {
    const handleKeyUp = () => {
      if (!isEditorReady) return;

      safeEditorAction((ctx) => {
        const view = ctx.get(editorViewCtx);
        const { state } = view;
        const { selection } = state;
        const pos = selection.from;

        // Get text before cursor (up to 50 chars)
        const start = Math.max(0, pos - 50);
        const textBefore = state.doc.textBetween(start, pos, '\n');

        // Check for "[@" pattern
        const citationMatch = textBefore.match(/\[@([a-zA-Z0-9_-]*)$/);

        if (citationMatch) {
          const query = citationMatch[1] || '';
          setCitationQuery(query);

          const coords = view.coordsAtPos(pos);
          const editorRect = editorContainerRef.current?.getBoundingClientRect();
          if (editorRect) {
            setCitationMenuPosition({
              top: coords.bottom - editorRect.top + 5,
              left: coords.left - editorRect.left,
            });
          }

          citationStartPos.current = pos - citationMatch[0].length;
          setShowCitationMenu(true);
        } else {
          setShowCitationMenu(false);
          citationStartPos.current = null;
        }
      });
    };

    const container = editorContainerRef.current;
    if (container) {
      container.addEventListener('keyup', handleKeyUp);
      return () => {
        container.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [isEditorReady, safeEditorAction]);

  // Handle citation selection
  const handleCitationSelect = useCallback((citationId: string) => {
    if (citationStartPos.current === null) return;

    const startPos = citationStartPos.current;
    safeEditorAction((ctx) => {
      const view = ctx.get(editorViewCtx);
      const { state } = view;
      const { selection } = state;

      const tr = state.tr.replaceWith(
        startPos,
        selection.from,
        state.schema.text(`[@${citationId}]`)
      );

      view.dispatch(tr);
      view.focus();
    });

    setShowCitationMenu(false);
    citationStartPos.current = null;
  }, [safeEditorAction]);

  // Apply font settings via CSS custom properties
  useEffect(() => {
    const container = editorContainerRef.current;
    if (container) {
      container.style.setProperty('--editor-font-size', `${settings.fontSize}px`);

      const fontFamilyMap: Record<string, string> = {
        system: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        jetbrains: "'JetBrains Mono', 'Consolas', monospace",
        fira: "'Fira Code', 'Consolas', monospace",
        source: "'Source Code Pro', 'Consolas', monospace",
        cascadia: "'Cascadia Code', 'Consolas', monospace",
      };
      container.style.setProperty('--editor-font-family', fontFamilyMap[settings.fontFamily] || fontFamilyMap.system);
    }
  }, [settings.fontSize, settings.fontFamily]);

  return (
    <div
      ref={editorContainerRef}
      className={`milkdown-editor-container ${settings.theme === 'dark' ? 'milkdown-dark' : 'milkdown-light'}`}
    >
      {showCitationMenu && (
        <CitationAutocomplete
          query={citationQuery}
          position={citationMenuPosition}
          onSelect={handleCitationSelect}
          onClose={() => setShowCitationMenu(false)}
        />
      )}
    </div>
  );
};
