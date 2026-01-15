import { useEffect, useRef, useCallback, useState } from 'react';
import { Editor, rootCtx, defaultValueCtx, editorViewCtx } from '@milkdown/kit/core';
import { Milkdown, MilkdownProvider, useEditor, useInstance } from '@milkdown/react';
import { commonmark } from '@milkdown/kit/preset/commonmark';
import { gfm } from '@milkdown/kit/preset/gfm';
import { history } from '@milkdown/plugin-history';
import { clipboard } from '@milkdown/plugin-clipboard';
import { listener, listenerCtx } from '@milkdown/plugin-listener';
import { cursor } from '@milkdown/plugin-cursor';
import { indent } from '@milkdown/plugin-indent';
import { useEditorStore } from '../../stores/editorStore';
import { useBibliographyStore } from '../../stores/bibliographyStore';
import './MilkdownEditor.css';

// Citation autocomplete component
const CitationAutocomplete: React.FC<{
  query: string;
  position: { top: number; left: number };
  onSelect: (citationId: string) => void;
  onClose: () => void;
}> = ({ query, position, onSelect, onClose }) => {
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
  }).slice(0, 10); // Limit to 10 results

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
          Aucune citation trouvée
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

const MilkdownEditorInner: React.FC = () => {
  const { content, setContent, settings } = useEditorStore();
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const [loading, getEditor] = useInstance();

  // Citation autocomplete state
  const [showCitationMenu, setShowCitationMenu] = useState(false);
  const [citationQuery, setCitationQuery] = useState('');
  const [citationMenuPosition, setCitationMenuPosition] = useState({ top: 0, left: 0 });
  const citationStartPos = useRef<number | null>(null);

  // Store editor reference
  const editorRef = useRef<Editor | null>(null);

  useEditor((root) =>
    Editor.make()
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, content);

        // Configure listener for content changes
        ctx.get(listenerCtx)
          .markdownUpdated((_ctx, markdown, prevMarkdown) => {
            if (markdown !== prevMarkdown) {
              setContent(markdown);
            }
          });
      })
      .use(commonmark)
      .use(gfm)
      .use(history)
      .use(clipboard)
      .use(listener)
      .use(cursor)
      .use(indent)
  );

  // Store editor reference for external access
  useEffect(() => {
    if (!loading) {
      const editor = getEditor();
      if (editor) {
        editorRef.current = editor;
        useEditorStore.setState({ milkdownEditor: editor });
      }
    }
  }, [loading, getEditor]);

  // Handle IPC text insertion from bibliography panel
  useEffect(() => {
    const handler = (text: string) => {
      if (!loading) {
        const editor = getEditor();
        if (editor) {
          editor.action((ctx) => {
            const view = ctx.get(editorViewCtx);
            const { state } = view;
            const { tr, selection } = state;
            tr.insertText(text, selection.from, selection.to);
            view.dispatch(tr);
            view.focus();
          });
        }
      }
    };

    window.electron.editor.onInsertText(handler);

    // Note: The IPC listener doesn't provide an unsubscribe mechanism
    // This is a known limitation of the current preload API
  }, [loading, getEditor]);

  // Handle citation autocomplete detection
  useEffect(() => {
    if (loading) return;

    const editor = getEditor();
    if (!editor) return;

    const handleKeyUp = () => {
      editor.action((ctx) => {
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
          // Show autocomplete
          const query = citationMatch[1] || '';
          setCitationQuery(query);

          // Calculate position for menu
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

    // Listen for input events
    const editorElement = editorContainerRef.current?.querySelector('.milkdown');
    if (editorElement) {
      editorElement.addEventListener('keyup', handleKeyUp);
      return () => {
        editorElement.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [loading, getEditor]);

  // Handle citation selection
  const handleCitationSelect = useCallback((citationId: string) => {
    if (loading) return;

    const editor = getEditor();
    if (!editor || citationStartPos.current === null) return;

    editor.action((ctx) => {
      const view = ctx.get(editorViewCtx);
      const { state } = view;
      const { selection } = state;

      // Replace from "[@" to current position with full citation
      const tr = state.tr.replaceWith(
        citationStartPos.current!,
        selection.from,
        state.schema.text(`[@${citationId}]`)
      );

      view.dispatch(tr);
      view.focus();
    });

    setShowCitationMenu(false);
    citationStartPos.current = null;
  }, [loading, getEditor]);

  // Apply settings
  useEffect(() => {
    const editorElement = editorContainerRef.current?.querySelector('.milkdown') as HTMLElement;
    if (editorElement) {
      // Font size
      editorElement.style.fontSize = `${settings.fontSize}px`;

      // Font family
      const fontFamilyMap: Record<string, string> = {
        system: "'SF Mono', 'Monaco', 'Consolas', 'Ubuntu Mono', monospace",
        jetbrains: "'JetBrains Mono', 'Consolas', monospace",
        fira: "'Fira Code', 'Consolas', monospace",
        source: "'Source Code Pro', 'Consolas', monospace",
        cascadia: "'Cascadia Code', 'Consolas', monospace",
      };
      editorElement.style.fontFamily = fontFamilyMap[settings.fontFamily] || fontFamilyMap.system;

      // Word wrap
      editorElement.style.overflowWrap = settings.wordWrap ? 'break-word' : 'normal';
      editorElement.style.whiteSpace = settings.wordWrap ? 'pre-wrap' : 'pre';
    }
  }, [settings.fontSize, settings.fontFamily, settings.wordWrap]);

  return (
    <div
      ref={editorContainerRef}
      className={`milkdown-editor-container ${settings.theme === 'dark' ? 'milkdown-dark' : 'milkdown-light'}`}
    >
      <Milkdown />
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

export const MilkdownEditor: React.FC = () => {
  return (
    <MilkdownProvider>
      <MilkdownEditorInner />
    </MilkdownProvider>
  );
};
