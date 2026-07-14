/** Normalize HTML from CSV / legacy imports — strip font tags, inline styles, etc. */
export function normalizeImportedProductHtml(html) {
  if (!html || typeof html !== 'string') return undefined;
  let out = html.trim();
  if (!out) return undefined;

  // Unwrap deprecated <font> tags but keep inner content
  out = out.replace(/<\/?font[^>]*>/gi, '');
  // Remove inline styles and legacy presentation attrs
  out = out.replace(/\sstyle="[^"]*"/gi, '').replace(/\sstyle='[^']*'/gi, '');
  out = out.replace(/\s(face|size|color)="[^"]*"/gi, '').replace(/\s(face|size|color)='[^']*'/gi, '');
  // Collapse excessive blank lines
  out = out.replace(/(\s*<br\s*\/?>\s*){3,}/gi, '<br><br>');

  return out.trim() || undefined;
}

/** Plain text for admin previews / search (server-safe). */
export function htmlToPlainText(html) {
  if (!html || typeof html !== 'string') return '';
  return html
    .replace(/<\/?font[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
