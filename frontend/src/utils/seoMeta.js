export const SCHEMA_TYPES = [
  { value: 'WebPage', label: 'Web Page' },
  { value: 'Article', label: 'Article' },
  { value: 'BlogPosting', label: 'Blog Post' },
  { value: 'FAQPage', label: 'FAQ Page' },
  { value: 'AboutPage', label: 'About Page' },
  { value: 'ContactPage', label: 'Contact Page' },
  { value: 'CollectionPage', label: 'Collection / Listing Page' },
  { value: 'Product', label: 'Product' },
  { value: 'LocalBusiness', label: 'Local Business' },
  { value: 'none', label: 'None (disable JSON-LD)' },
];

export const TWITTER_CARD_TYPES = [
  { value: 'summary_large_image', label: 'Large image summary' },
  { value: 'summary', label: 'Small summary' },
];

export function emptySeoMeta(overrides = {}) {
  return {
    metaTitle: '',
    metaDescription: '',
    focusKeyword: '',
    metaKeywords: [],
    ogTitle: '',
    ogDescription: '',
    ogImage: { url: '', alt: '' },
    twitterCard: 'summary_large_image',
    canonicalUrl: '',
    robotsIndex: true,
    robotsFollow: true,
    schemaType: 'WebPage',
    schemaJson: '',
    geo: {
      placename: '',
      region: '',
      country: 'Nepal',
      latitude: '',
      longitude: '',
    },
    ...overrides,
    geo: {
      placename: '',
      region: '',
      country: 'Nepal',
      latitude: '',
      longitude: '',
      ...(overrides.geo || {}),
    },
    ogImage: {
      url: '',
      alt: '',
      ...(overrides.ogImage || {}),
    },
  };
}

export function mergeEntitySeo(entity = {}) {
  const legacy = {
    metaTitle: entity.metaTitle,
    metaDescription: entity.metaDescription,
  };
  return normalizeSeoMeta({ ...legacy, ...(entity.seo || {}) });
}

export function stripHtmlText(html = '') {
  return String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

export function mergeProductSeo(product = {}) {
  const primaryImage = product.images?.find((i) => i.isPrimary) || product.images?.[0];
  const rawDesc = product.metaDescription
    || (product.shortDescriptionEnabled && product.shortDescription)
    || product.shortDescription
    || product.description
    || product.longDescription
    || '';
  const description = product.metaDescription || stripHtmlText(rawDesc).slice(0, 160);
  const title = product.metaTitle || `${product.name} | Buy Online in Nepal | KoseliXpress`.slice(0, 60);

  return normalizeSeoMeta(
    {
      metaTitle: product.metaTitle,
      metaDescription: description,
      focusKeyword: product.focusKeyword,
      metaKeywords: Array.isArray(product.metaKeywords) ? product.metaKeywords : [],
      schemaType: 'Product',
    },
    {
      title,
      description: description || `Shop ${product.name} online at KoseliXpress Nepal.`,
      image: primaryImage?.url,
      imageAlt: primaryImage?.alt || product.name,
      path: product.slug ? `/shop/${product.slug}` : '',
      schemaType: 'Product',
    }
  );
}

export function categoryShopPath(category) {
  if (!category?.slug) return '/shop';
  return `/shop/category/${category.slug}`;
}

export function normalizeSeoMeta(seo = {}, fallbacks = {}) {
  const site = fallbacks.siteSettings || {};
  const title = seo.metaTitle?.trim()
    || fallbacks.title?.trim()
    || site.meta_title?.trim()
    || '';
  const description = seo.metaDescription?.trim()
    || fallbacks.description?.trim()
    || site.meta_description?.trim()
    || '';
  const keywords = Array.isArray(seo.metaKeywords) && seo.metaKeywords.length
    ? seo.metaKeywords
    : String(site.meta_keywords || '')
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

  const ogImageUrl = seo.ogImage?.url
    || fallbacks.image
    || site.default_og_image
    || '';

  const canonical = seo.canonicalUrl?.trim()
    || fallbacks.url
    || '';

  const geo = {
    placename: seo.geo?.placename || site.geo_placename || '',
    region: seo.geo?.region || site.geo_region || '',
    country: seo.geo?.country || site.geo_country || 'Nepal',
    latitude: seo.geo?.latitude || site.geo_latitude || '',
    longitude: seo.geo?.longitude || site.geo_longitude || '',
  };

  return {
    metaTitle: title,
    metaDescription: description,
    focusKeyword: seo.focusKeyword?.trim() || '',
    metaKeywords: keywords,
    ogTitle: seo.ogTitle?.trim() || title,
    ogDescription: seo.ogDescription?.trim() || description,
    ogImage: {
      url: ogImageUrl,
      alt: seo.ogImage?.alt?.trim() || fallbacks.imageAlt || title,
    },
    twitterCard: seo.twitterCard || 'summary_large_image',
    canonicalUrl: canonical,
    robotsIndex: seo.robotsIndex !== false,
    robotsFollow: seo.robotsFollow !== false,
    schemaType: seo.schemaType || fallbacks.schemaType || 'WebPage',
    schemaJson: seo.schemaJson?.trim() || '',
    geo,
  };
}

export function absoluteUrl(path, siteUrl = '') {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const base = String(siteUrl || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/$/, '');
  if (!base) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildJsonLd(meta, context = {}) {
  if (meta.schemaType === 'none') return null;
  if (meta.schemaJson) {
    try {
      return JSON.parse(meta.schemaJson);
    } catch {
      return null;
    }
  }

  const site = context.siteSettings || {};
  const siteUrl = site.site_url || context.siteUrl || '';
  const pageUrl = absoluteUrl(meta.canonicalUrl || context.path || '/', siteUrl);
  const businessName = site.business_name || site.store_name || 'KoseliXpress';
  const image = meta.ogImage?.url ? absoluteUrl(meta.ogImage.url, siteUrl) : undefined;

  const base = {
    '@context': 'https://schema.org',
  };

  const type = meta.schemaType || 'WebPage';

  if (type === 'Product') {
    const product = context.product || {};
    const price = context.price ?? product.price;
    const inStock = (product.stock ?? 0) > 0;
    return {
      ...base,
      '@type': 'Product',
      name: context.title || product.name || meta.metaTitle,
      description: meta.metaDescription,
      image: image ? [image] : undefined,
      sku: product.sku || undefined,
      brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
      offers: {
        '@type': 'Offer',
        url: pageUrl,
        priceCurrency: context.priceCurrency || 'NPR',
        price: String(price ?? 0),
        availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
    };
  }

  if (type === 'BlogPosting' || type === 'Article') {
    return {
      ...base,
      '@type': type,
      headline: context.title || meta.metaTitle,
      description: meta.metaDescription,
      image: image ? [image] : undefined,
      datePublished: context.publishedAt,
      dateModified: context.updatedAt,
      author: context.authorName
        ? { '@type': 'Person', name: context.authorName }
        : { '@type': 'Organization', name: businessName },
      publisher: {
        '@type': 'Organization',
        name: businessName,
        url: siteUrl || undefined,
      },
      mainEntityOfPage: pageUrl,
      keywords: meta.metaKeywords?.join(', ') || undefined,
    };
  }

  if (type === 'LocalBusiness') {
    const payload = {
      ...base,
      '@type': 'LocalBusiness',
      name: businessName,
      description: meta.metaDescription,
      url: siteUrl || pageUrl,
      image,
    };
    if (meta.geo.latitude && meta.geo.longitude) {
      payload.geo = {
        '@type': 'GeoCoordinates',
        latitude: meta.geo.latitude,
        longitude: meta.geo.longitude,
      };
    }
    if (meta.geo.placename || meta.geo.region) {
      payload.address = {
        '@type': 'PostalAddress',
        addressLocality: meta.geo.placename || undefined,
        addressRegion: meta.geo.region || undefined,
        addressCountry: meta.geo.country || undefined,
      };
    }
    return payload;
  }

  return {
    ...base,
    '@type': type,
    name: context.title || meta.metaTitle,
    description: meta.metaDescription,
    url: pageUrl,
    image,
  };
}

export function charCountHint(value, min, max) {
  const len = (value || '').length;
  if (!len) return `${max} chars recommended`;
  if (len < min) return `${len}/${max} — aim for at least ${min}`;
  if (len > max) return `${len}/${max} — too long`;
  return `${len}/${max} — good`;
}
