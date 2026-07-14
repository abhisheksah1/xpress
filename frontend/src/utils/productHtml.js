/** True when content includes HTML tags (imported product descriptions). */
export function isHtmlContent(text) {
  return /<[a-z][\s\S]*>/i.test(String(text || '').trim());
}

/** Basic sanitization for admin-authored product HTML (browser only). */
export function sanitizeProductHtml(html) {
  if (!html || typeof html !== 'string') return '';
  const trimmed = html.trim();
  if (!isHtmlContent(trimmed)) return trimmed;

  if (typeof DOMParser === 'undefined') return trimmed;

  const doc = new DOMParser().parseFromString(trimmed, 'text/html');

  doc.querySelectorAll('script, style, iframe, object, embed, form, link, meta').forEach((el) => {
    el.remove();
  });

  doc.querySelectorAll('font').forEach((el) => {
    const parent = el.parentNode;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    el.remove();
  });

  doc.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value?.trim().toLowerCase() || '';
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      if ((name === 'href' || name === 'src') && value.startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    });
    el.removeAttribute('style');
    el.removeAttribute('class');
  });

  doc.querySelectorAll('a[href]').forEach((anchor) => {
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener noreferrer');
  });

  doc.querySelectorAll('img').forEach((img) => {
    img.removeAttribute('width');
    img.removeAttribute('height');
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    if (!img.getAttribute('alt')) img.setAttribute('alt', '');
  });

  doc.querySelectorAll('table').forEach((table) => {
    table.removeAttribute('width');
    table.removeAttribute('height');
  });

  doc.querySelectorAll('td, th').forEach((cell) => {
    cell.removeAttribute('width');
    cell.removeAttribute('height');
  });

  return doc.body.innerHTML.trim();
}

export function prepareProductContent(text) {
  if (!text?.trim()) return { mode: 'empty', content: '' };
  if (isHtmlContent(text)) {
    return { mode: 'html', content: sanitizeProductHtml(text) };
  }
  return { mode: 'text', content: text.trim() };
}

/** Plain text for admin labels / previews. */
export function htmlToPlainText(html) {
  if (!html?.trim()) return '';
  if (typeof DOMParser !== 'undefined') {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return (doc.body.textContent || '')
      .replace(/\u00a0/g, ' ')
      .replace(/\s+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
  }
  return html
    .replace(/<\/?font[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
