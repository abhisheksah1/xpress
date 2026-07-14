import ProductRichText from '../store/ProductRichText.jsx';
import { htmlToPlainText, isHtmlContent } from '../../utils/productHtml.js';

export default function AdminDescriptionPreview({ content, label = 'Readable preview' }) {
  if (!content?.trim()) return null;

  const plain = htmlToPlainText(content);
  const hasHtml = isHtmlContent(content);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      {hasHtml ? (
        <div className="text-sm text-slate-700 leading-relaxed admin-description-preview">
          <ProductRichText content={content} />
        </div>
      ) : (
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{plain}</p>
      )}
    </div>
  );
}
