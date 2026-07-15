/** Escape text for safe HTML attribute / element content. */
export const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const BLOCK_START = '<!--seo-head-->';
const BLOCK_END = '<!--/seo-head-->';

const metaTag = (attr, key, content) => {
  if (content == null || content === '') return '';
  return `<meta ${attr}="${escapeHtml(key)}" content="${escapeHtml(content)}" />`;
};

const linkTag = (rel, href) => {
  if (!href) return '';
  return `<link rel="${escapeHtml(rel)}" href="${escapeHtml(href)}" />`;
};

/** Build injectable <head> snippets from resolved SEO meta. */
export const buildSeoHeadBlock = (meta = {}) => {
  const lines = [];

  if (meta.title) {
    lines.push(`<title>${escapeHtml(meta.title)}</title>`);
  }

  lines.push(metaTag('name', 'description', meta.description));
  lines.push(metaTag('name', 'keywords', meta.keywords));
  lines.push(metaTag('name', 'robots', meta.robots));

  if (meta.googleSiteVerification) {
    lines.push(metaTag('name', 'google-site-verification', meta.googleSiteVerification));
  }
  if (meta.bingSiteVerification) {
    lines.push(metaTag('name', 'msvalidate.01', meta.bingSiteVerification));
  }

  const geo = meta.geo || {};
  lines.push(metaTag('name', 'geo.placename', geo.placename));
  lines.push(metaTag('name', 'geo.region', geo.region));
  lines.push(metaTag('name', 'geo.country', geo.country));
  if (geo.latitude) {
    lines.push(metaTag('name', 'geo.position', `${geo.latitude};${geo.longitude || ''}`));
  }
  if (geo.latitude && geo.longitude) {
    lines.push(metaTag('name', 'ICBM', `${geo.latitude}, ${geo.longitude}`));
  }

  lines.push(linkTag('canonical', meta.canonical));

  lines.push(metaTag('property', 'og:type', meta.ogType || 'website'));
  lines.push(metaTag('property', 'og:title', meta.ogTitle || meta.title));
  lines.push(metaTag('property', 'og:description', meta.ogDescription || meta.description));
  lines.push(metaTag('property', 'og:url', meta.canonical));
  lines.push(metaTag('property', 'og:image', meta.ogImage));
  lines.push(metaTag('property', 'og:image:alt', meta.ogImageAlt));

  lines.push(metaTag('name', 'twitter:card', meta.twitterCard || 'summary_large_image'));
  lines.push(metaTag('name', 'twitter:title', meta.ogTitle || meta.title));
  lines.push(metaTag('name', 'twitter:description', meta.ogDescription || meta.description));
  lines.push(metaTag('name', 'twitter:image', meta.ogImage));

  if (meta.jsonLd && typeof meta.jsonLd === 'object') {
    lines.push(
      `<script type="application/ld+json" id="server-seo-json-ld">${JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c')}</script>`
    );
  }

  return lines.filter(Boolean).join('\n');
};

/**
 * Inject or replace SEO tags inside an HTML document string.
 * Safe to call repeatedly — uses a marked block.
 */
export const injectSeoIntoHtml = (html, meta) => {
  if (!html || typeof html !== 'string') return html;
  const block = buildSeoHeadBlock(meta || {});
  if (!block) return html;

  const wrapped = `${BLOCK_START}\n${block}\n${BLOCK_END}`;

  if (html.includes(BLOCK_START) && html.includes(BLOCK_END)) {
    return html.replace(
      new RegExp(`${BLOCK_START}[\\s\\S]*?${BLOCK_END}`),
      wrapped
    );
  }

  let out = html
    .replace(/<title>[\s\S]*?<\/title>/i, '')
    .replace(/<meta\s+name=["']description["'][^>]*>/i, '');

  if (/<\/head>/i.test(out)) {
    return out.replace(/<\/head>/i, `${wrapped}\n</head>`);
  }
  return `${wrapped}\n${out}`;
};
