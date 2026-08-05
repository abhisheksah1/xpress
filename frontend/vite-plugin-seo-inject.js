/**
 * Vite plugin: inject admin-managed SEO into the SPA index.html for each route.
 * Crawlers and "View Source" then see title / description / OG / H1 / JSON-LD without waiting for React.
 */

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const HEAD_START = '<!--seo-head-->';
const HEAD_END = '<!--/seo-head-->';
const BODY_START = '<!--seo-body-->';
const BODY_END = '<!--/seo-body-->';

function metaTag(attr, key, content) {
  if (content == null || content === '') return '';
  return `<meta ${attr}="${escapeHtml(key)}" content="${escapeHtml(content)}" />`;
}

function linkTag(rel, href) {
  if (!href) return '';
  return `<link rel="${escapeHtml(rel)}" href="${escapeHtml(href)}" />`;
}

function buildSeoHeadBlock(meta = {}) {
  const lines = [];
  if (meta.title) lines.push(`<title>${escapeHtml(meta.title)}</title>`);
  lines.push(metaTag('name', 'description', meta.description));
  lines.push(metaTag('name', 'keywords', meta.keywords));
  if (meta.focusKeyword) lines.push(metaTag('name', 'news_keywords', meta.focusKeyword));
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
}

function buildSeoBodyBlock(meta = {}) {
  const h1 = String(meta.h1 || meta.title || '').trim();
  const h2 = String(meta.h2 || meta.focusKeyword || '').trim();
  if (!h1 && !h2) return '';
  // Visible crawlable H1 — Rank Math ignores clipped/aria-hidden headings.
  const parts = ['<div id="seo-prerender" class="seo-prerender">'];
  if (h1) parts.push(`<h1>${escapeHtml(h1)}</h1>`);
  if (h2 && h2.toLowerCase() !== h1.toLowerCase()) {
    parts.push(`<h2>${escapeHtml(h2)}</h2>`);
  }
  parts.push('</div>');
  return parts.join('\n');
}

function injectSeoIntoHtml(html, meta) {
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
}

function pathnameFromUrl(url = '/') {
  try {
    const u = new URL(url, 'http://localhost');
    return u.pathname || '/';
  } catch {
    return String(url).split('?')[0] || '/';
  }
}

function shouldSkipPath(pathname) {
  if (!pathname) return true;
  if (pathname.startsWith('/admin')) return true;
  if (pathname.startsWith('/api')) return true;
  if (pathname.startsWith('/src')) return true;
  if (pathname.startsWith('/@')) return true;
  if (pathname.startsWith('/node_modules')) return true;
  if (/\.[a-zA-Z0-9]+$/.test(pathname) && !pathname.endsWith('.html')) return true;
  return false;
}

export function seoHtmlInjectPlugin({ apiTarget }) {
  return {
    name: 'seo-html-inject',
    transformIndexHtml: {
      order: 'pre',
      async handler(html, ctx) {
        const pathname = pathnameFromUrl(ctx.originalUrl || ctx.path || '/');
        if (shouldSkipPath(pathname)) return html;

        try {
          const endpoint = `${apiTarget}/api/v1/store/seo/meta?path=${encodeURIComponent(pathname)}`;
          const res = await fetch(endpoint);
          if (!res.ok) return html;
          const json = await res.json();
          const meta = json?.data;
          if (!meta) return html;
          return injectSeoIntoHtml(html, meta);
        } catch {
          return html;
        }
      },
    },
  };
}
