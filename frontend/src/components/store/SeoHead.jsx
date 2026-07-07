import { useEffect } from 'react';
import { buildJsonLd, normalizeSeoMeta, absoluteUrl } from '../../utils/seoMeta.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';

const upsertMeta = (attr, key, content) => {
  if (!content && content !== '0') return;
  let el = document.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
};

const upsertLink = (rel, href) => {
  if (!href) return;
  let el = document.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
};

const upsertJsonLd = (id, data) => {
  const existing = document.getElementById(id);
  if (!data) {
    existing?.remove();
    return;
  }
  const el = existing || document.createElement('script');
  el.id = id;
  el.type = 'application/ld+json';
  el.textContent = JSON.stringify(data);
  if (!existing) document.head.appendChild(el);
};

export default function SeoHead({
  seo,
  fallbacks = {},
  siteSettings = {},
  jsonLdContext = {},
  jsonLdId = 'page-json-ld',
}) {
  const meta = normalizeSeoMeta(seo || {}, { ...fallbacks, siteSettings });
  const siteUrl = siteSettings.site_url || (typeof window !== 'undefined' ? window.location.origin : '');
  const canonical = absoluteUrl(meta.canonicalUrl || fallbacks.path || '', siteUrl)
    || (typeof window !== 'undefined' ? window.location.href : '');
  const ogImage = meta.ogImage?.url ? absoluteUrl(resolveMediaUrl(meta.ogImage.url), siteUrl) : '';
  const robots = `${meta.robotsIndex ? 'index' : 'noindex'}, ${meta.robotsFollow ? 'follow' : 'nofollow'}`;
  const keywords = meta.metaKeywords?.join(', ');

  useEffect(() => {
    if (meta.metaTitle) document.title = meta.metaTitle;

    upsertMeta('name', 'description', meta.metaDescription);
    if (keywords) upsertMeta('name', 'keywords', keywords);
    upsertMeta('name', 'robots', robots);

    if (siteSettings.google_site_verification) {
      upsertMeta('name', 'google-site-verification', siteSettings.google_site_verification);
    }
    if (siteSettings.bing_site_verification) {
      upsertMeta('name', 'msvalidate.01', siteSettings.bing_site_verification);
    }

    if (meta.geo.placename) upsertMeta('name', 'geo.placename', meta.geo.placename);
    if (meta.geo.region) upsertMeta('name', 'geo.region', meta.geo.region);
    if (meta.geo.country) upsertMeta('name', 'geo.country', meta.geo.country);
    if (meta.geo.latitude) upsertMeta('name', 'geo.position', `${meta.geo.latitude};${meta.geo.longitude}`);
    if (meta.geo.latitude && meta.geo.longitude) {
      upsertMeta('name', 'ICBM', `${meta.geo.latitude}, ${meta.geo.longitude}`);
    }

    upsertLink('canonical', canonical);

    upsertMeta('property', 'og:type', jsonLdContext.ogType || 'website');
    upsertMeta('property', 'og:title', meta.ogTitle);
    upsertMeta('property', 'og:description', meta.ogDescription);
    upsertMeta('property', 'og:url', canonical);
    if (ogImage) upsertMeta('property', 'og:image', ogImage);
    if (meta.ogImage?.alt) upsertMeta('property', 'og:image:alt', meta.ogImage.alt);

    upsertMeta('name', 'twitter:card', meta.twitterCard);
    upsertMeta('name', 'twitter:title', meta.ogTitle);
    upsertMeta('name', 'twitter:description', meta.ogDescription);
    if (ogImage) upsertMeta('name', 'twitter:image', ogImage);

    const jsonLd = buildJsonLd(meta, { ...jsonLdContext, siteSettings, siteUrl });
    upsertJsonLd(jsonLdId, jsonLd);
  }, [
    meta.metaTitle,
    meta.metaDescription,
    meta.ogTitle,
    meta.ogDescription,
    meta.twitterCard,
    meta.robotsIndex,
    meta.robotsFollow,
    keywords,
    robots,
    canonical,
    ogImage,
    jsonLdId,
    siteSettings,
    jsonLdContext,
  ]);

  return null;
}
