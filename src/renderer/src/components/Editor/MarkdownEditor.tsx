import React, { useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useEditorStore } from '../../stores/editorStore';
import './MarkdownEditor.css';

export const MarkdownEditor: React.FC = () => {
  const { content, setContent, settings } = useEditorStore();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Listen for insert text commands from bibliography
  useEffect(() => {
    const unsubscribe = window.electron.editor.onInsertText((text: string) => {
      if (editorRef.current) {
        const selection = editorRef.current.getSelection();
        if (selection) {
          editorRef.current.executeEdits('insert-citation', [
            {
              range: selection,
              text: text,
            },
          ]);
          // Move cursor to end of inserted text
          const newPosition = {
            lineNumber: selection.startLineNumber,
            column: selection.startColumn + text.length,
          };
          editorRef.current.setPosition(newPosition);
          editorRef.current.focus();
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Configure markdown language
    monaco.languages.setLanguageConfiguration('markdown', {
      wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
    });

    // Add custom citation autocomplete
    monaco.languages.registerCompletionItemProvider('markdown', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        // Trigger on "[@"
        const textUntilPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        });

        if (textUntilPosition.endsWith('[@')) {
          // TODO: Get citations from bibliography store
          return {
            suggestions: [
              {
                label: '@author2023',
                kind: monaco.languages.CompletionItemKind.Reference,
                insertText: 'author2023]',
                range: range,
                documentation: 'Author (2023) - Title',
              },
            ],
          };
        }

        return { suggestions: [] };
      },
    });
  };

  const handleEditorChange = (value: string | undefined) => {
    setContent(value || '');
  };

  // Font family mapping
  const getFontFamily = () => {
    switch (settings.fontFamily) {
      case 'system':
        return "'SF Mono', 'Monaco', 'Consolas', 'Ubuntu Mono', monospace";
      case 'jetbrains':
        return "'JetBrains Mono', 'Consolas', monospace";
      case 'fira':
        return "'Fira Code', 'Consolas', monospace";
      case 'source':
        return "'Source Code Pro', 'Consolas', monospace";
      case 'cascadia':
        return "'Cascadia Code', 'Consolas', monospace";
      default:
        return "'SF Mono', 'Monaco', 'Consolas', 'Ubuntu Mono', monospace";
    }
  };

  return (
    <div className="markdown-editor">
      <Editor
        height="100%"
        defaultLanguage="markdown"
        value={content}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme={settings.theme === 'dark' ? 'vs-dark' : 'light'}
        options={{
          fontSize: settings.fontSize,
          wordWrap: settings.wordWrap ? 'on' : 'off',
          minimap: { enabled: settings.showMinimap },
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          insertSpaces: true,
          formatOnPaste: true,
          formatOnType: true,
          rulers: [80, 120],
          renderWhitespace: 'selection',
          cursorBlinking: 'smooth',
          smoothScrolling: true,
          fontFamily: getFontFamily(),
          fontLigatures: settings.fontFamily !== 'system',
        }}
      />
    </div>
  );
};
