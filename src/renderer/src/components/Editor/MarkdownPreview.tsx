import React, { useMemo } from 'react';
import { marked } from 'marked';
import { useEditorStore } from '../../stores/editorStore';
import './MarkdownPreview.css';

export const MarkdownPreview: React.FC = () => {
  const { content } = useEditorStore();

  // Configure marked for academic markdown
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  const htmlContent = useMemo(() => {
    try {
      return marked.parse(content);
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return '<p>Erreur de parsing markdown</p>';
    }
  }, [content]);

  return (
    <div className="markdown-preview">
      <div className="preview-content" dangerouslySetInnerHTML={{ __html: htmlContent }} />
    </div>
  );
};
