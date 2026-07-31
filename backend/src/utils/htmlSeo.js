/** Escape text for safe HTML attribute / element content. */
export const escapeHtml = (value = '') =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const HEAD_START = '<!--seo-head-->';
const HEAD_END = '<!--/seo-head-->';
const BODY_START = '<!--seo-body-->';
const BODY_END = '<!--/seo-body-->';

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
  if (meta.focusKeyword) {
    lines.push(metaTag('name', 'news_keywords', meta.focusKeyword));
  }
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
 * Crawler-visible body content (H1 / intro) so Google sees headings before React boots.
 * Removed by the client on first paint so shoppers only see the React app.
 */
export const buildSeoBodyBlock = (meta = {}) => {
  const h1 = String(meta.h1 || meta.title || '').trim();
  const h2 = String(meta.h2 || meta.focusKeyword || '').trim();
  const description = String(meta.description || '').trim();
  if (!h1 && !description) return '';

  const parts = ['<div id="seo-prerender">'];
  if (h1) parts.push(`<h1>${escapeHtml(h1)}</h1>`);
  if (h2 && h2.toLowerCase() !== h1.toLowerCase()) {
    parts.push(`<h2>${escapeHtml(h2)}</h2>`);
  }
  if (description) parts.push(`<p>${escapeHtml(description)}</p>`);
  parts.push('</div>');
  return parts.join('\n');
};

/**
 * Inject or replace SEO tags inside an HTML document string.
 * Safe to call repeatedly — uses marked blocks for head + body.
 */
export const injectSeoIntoHtml = (html, meta) => {
  if (!html || typeof html !== 'string') return html;
  const headBlock = buildSeoHeadBlock(meta || {});
  const bodyBlock = buildSeoBodyBlock(meta || {});
  if (!headBlock && !bodyBlock) return html;

  let out = html;

  if (headBlock) {
    const wrappedHead = `${HEAD_START}\n${headBlock}\n${HEAD_END}`;
    if (out.includes(HEAD_START) && out.includes(HEAD_END)) {
      out = out.replace(new RegExp(`${HEAD_START}[\\s\\S]*?${HEAD_END}`), wrappedHead);
    } else {
      out = out
        .replace(/<title>[\s\S]*?<\/title>/i, '')
        .replace(/<meta\s+name=["']description["'][^>]*>/i, '');
      if (/<\/head>/i.test(out)) {
        out = out.replace(/<\/head>/i, `${wrappedHead}\n</head>`);
      } else {
        out = `${wrappedHead}\n${out}`;
      }
    }
  }

  if (bodyBlock) {
    const wrappedBody = `${BODY_START}\n${bodyBlock}\n${BODY_END}`;
    if (out.includes(BODY_START) && out.includes(BODY_END)) {
      out = out.replace(new RegExp(`${BODY_START}[\\s\\S]*?${BODY_END}`), wrappedBody);
    } else if (/<div id=["']root["'][^>]*>/i.test(out)) {
      out = out.replace(/<div id=["']root["'][^>]*>/i, `${wrappedBody}\n$&`);
    } else if (/<body[^>]*>/i.test(out)) {
      out = out.replace(/<body([^>]*)>/i, `<body$1>\n${wrappedBody}`);
    }
  }

  return out;
};
