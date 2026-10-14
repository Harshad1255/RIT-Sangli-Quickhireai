import React from 'react';

/**
 * Clean, safe, zero-dependency Markdown renderer for LeetCode/GFG problem statements.
 * Properly formats headings, code blocks, inline code, bold text, lists, and spacing.
 */
const escapeHtml = (text) => {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const renderInline = (text) => {
  if (!text) return '';
  // Escape HTML first for safety
  let safe = escapeHtml(text);
  
  // Inline code: `code`
  safe = safe.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');
  // Bold: **text** or __text__
  safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  safe = safe.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  // Italic: *text* or _text_
  safe = safe.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  safe = safe.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  return safe;
};

const MarkdownRenderer = ({ content }) => {
  if (!content) return null;

  // Split content by code blocks first
  const parts = [];
  const lines = String(content).split(/\r?\n/);
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBuffer = [];
  let textBuffer = [];

  const flushTextBuffer = () => {
    if (textBuffer.length > 0) {
      parts.push({ type: 'text', lines: [...textBuffer] });
      textBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      if (!inCodeBlock) {
        flushTextBuffer();
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
        codeBuffer = [];
      } else {
        inCodeBlock = false;
        parts.push({ type: 'code', lang: codeBlockLang, code: codeBuffer.join('\n') });
        codeBuffer = [];
      }
    } else if (inCodeBlock) {
      codeBuffer.push(line);
    } else {
      textBuffer.push(line);
    }
  }
  flushTextBuffer();
  if (codeBuffer.length > 0) {
    parts.push({ type: 'code', lang: codeBlockLang, code: codeBuffer.join('\n') });
  }

  return (
    <div className="markdown-content">
      {parts.map((part, pIdx) => {
        if (part.type === 'code') {
          return (
            <pre key={pIdx} className="md-code-block">
              <code>{part.code}</code>
            </pre>
          );
        }

        // Process text lines (headings, lists, paragraphs)
        const renderedElements = [];
        let listItems = [];

        const flushList = () => {
          if (listItems.length > 0) {
            renderedElements.push(
              <ul key={`ul-${renderedElements.length}`} className="md-list">
                {listItems.map((item, idx) => (
                  <li key={idx} dangerouslySetInnerHTML={{ __html: renderInline(item) }} />
                ))}
              </ul>
            );
            listItems = [];
          }
        };

        for (let j = 0; j < part.lines.length; j++) {
          const rawLine = part.lines[j];
          const trimmed = rawLine.trim();

          if (!trimmed) {
            flushList();
            continue;
          }

          if (trimmed.startsWith('### ')) {
            flushList();
            renderedElements.push(
              <h4 key={`h3-${j}`} className="md-h3" dangerouslySetInnerHTML={{ __html: renderInline(trimmed.slice(4)) }} />
            );
          } else if (trimmed.startsWith('## ')) {
            flushList();
            renderedElements.push(
              <h3 key={`h2-${j}`} className="md-h2" dangerouslySetInnerHTML={{ __html: renderInline(trimmed.slice(3)) }} />
            );
          } else if (trimmed.startsWith('# ')) {
            flushList();
            renderedElements.push(
              <h2 key={`h1-${j}`} className="md-h1" dangerouslySetInnerHTML={{ __html: renderInline(trimmed.slice(2)) }} />
            );
          } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            listItems.push(trimmed.slice(2));
          } else if (/^\d+\.\s/.test(trimmed)) {
            flushList();
            renderedElements.push(
              <div key={`ol-item-${j}`} className="md-numbered-item" dangerouslySetInnerHTML={{ __html: renderInline(trimmed) }} />
            );
          } else {
            flushList();
            renderedElements.push(
              <p key={`p-${j}`} className="md-paragraph" dangerouslySetInnerHTML={{ __html: renderInline(rawLine) }} />
            );
          }
        }
        flushList();

        return <div key={pIdx}>{renderedElements}</div>;
      })}
    </div>
  );
};

export default MarkdownRenderer;
