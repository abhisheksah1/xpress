import { useMemo } from 'react';
import { prepareProductContent } from '../../utils/productHtml.js';

export default function ProductRichText({ content, className = '' }) {
  const prepared = useMemo(() => prepareProductContent(content), [content]);

  if (prepared.mode === 'empty') return null;

  const wrapClass = `product-rich-text-container min-w-0 w-full ${className}`.trim();

  if (prepared.mode === 'html') {
    return (
      <div className={wrapClass}>
        <div
          className="product-rich-text"
          dangerouslySetInnerHTML={{ __html: prepared.content }}
        />
      </div>
    );
  }

  return (
    <div className={wrapClass}>
      <div className="product-rich-text whitespace-pre-line">{prepared.content}</div>
    </div>
  );
}
