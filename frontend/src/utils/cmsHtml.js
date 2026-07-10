import { isHtmlContent } from './productHtml.js';
import { buildLegacyTextSections } from './textBlockSections.js';

/** Convert section-based text blocks into HTML for the rich editor. */
export function sectionsToHtml(block = {}) {
  const sections = buildLegacyTextSections(block);
  if (!sections.length) {
    if (block.content && isHtmlContent(block.content)) return block.content;
    return block.content ? `<p>${escapeHtml(block.content)}</p>` : '';
  }

  return sections
    .map((section) => {
      if (section.type === 'image') {
        const src = section.image?.url || '';
        if (!src) return '';
        const alt = escapeHtml(section.image?.alt || '');
        return `<img src="${escapeAttr(src)}" alt="${alt}" class="cms-rich-image" />`;
      }
      const tag = ['h1', 'h2', 'h3', 'p'].includes(section.type) ? section.type : 'p';
      const text = escapeHtml(section.text || '').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      if (!text.trim()) return '';
      const style = section.color ? ` style="color:${escapeAttr(section.color)}"` : '';
      const underline = section.underline ? ' text-decoration:underline;' : '';
      const styleAttr = section.color || section.underline
        ? ` style="${section.color ? `color:${escapeAttr(section.color)};` : ''}${section.underline ? 'text-decoration:underline;' : ''}"`
        : '';
      void style;
      void underline;
      return `<${tag}${styleAttr}>${text}</${tag}>`;
    })
    .filter(Boolean)
    .join('');
}

export function getTextBlockHtml(block = {}) {
  const cfg = block.settings || {};
  if (cfg.html && isHtmlContent(cfg.html)) return cfg.html;
  if (block.content && isHtmlContent(block.content)) return block.content;
  if (Array.isArray(cfg.sections) && cfg.sections.length) return sectionsToHtml(block);
  return sectionsToHtml(block);
}

/** Sanitizer for CMS rich text — keeps class/style for colours & buttons. */
export function sanitizeCmsHtml(html) {
  if (!html || typeof html !== 'string') return '';
  const trimmed = html.trim();
  if (!isHtmlContent(trimmed)) return trimmed;
  if (typeof DOMParser === 'undefined') return trimmed;

  const doc = new DOMParser().parseFromString(trimmed, 'text/html');

  doc.querySelectorAll('script, iframe, object, embed, form, link, meta').forEach((el) => el.remove());

  doc.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = attr.value?.trim().toLowerCase() || '';
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      if ((name === 'href' || name === 'src') && value.startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    });
  });

  doc.querySelectorAll('a[href]').forEach((anchor) => {
    const href = anchor.getAttribute('href') || '';
    const isExternal = /^https?:\/\//i.test(href);
    if (isExternal) {
      anchor.setAttribute('target', '_blank');
      anchor.setAttribute('rel', 'noopener noreferrer');
    }
  });

  doc.querySelectorAll('img').forEach((img) => {
    img.setAttribute('loading', 'lazy');
    img.setAttribute('decoding', 'async');
    if (!img.getAttribute('alt')) img.setAttribute('alt', '');
  });

  return doc.body.innerHTML.trim();
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/</g, '&lt;');
}
