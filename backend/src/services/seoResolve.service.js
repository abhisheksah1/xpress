import { Product, Category, Blog, CMSPage } from '../models/index.js';
import { getPublicSettings } from './settings.service.js';
import config from '../config/index.js';
import { forClientMediaUrl } from '../utils/mediaUrl.js';

const NOINDEX_PREFIXES = [
  '/admin',
  '/cart',
  '/checkout',
  '/login',
  '/register',
  '/orders',
  '/track',
  '/reminders',
];

const stripHtml = (html = '') =>
  String(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const absoluteUrl = (pathOrUrl, siteUrl) => {
  if (!pathOrUrl) return '';
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = String(siteUrl || '').replace(/\/$/, '');
  if (!base) return pathOrUrl;
  return `${base}${pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`}`;
};

const normalizePath = (raw = '/') => {
  let path = String(raw || '/').split('?')[0].split('#')[0].trim() || '/';
  if (!path.startsWith('/')) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return path || '/';
};

const emptyGeo = () => ({
  placename: '',
  region: '',
  country: 'Nepal',
  latitude: '',
  longitude: '',
});

const mergeEntity = (entity = {}) => {
  const seo = entity.seo && typeof entity.seo === 'object' ? { ...entity.seo } : {};
  if (!seo.metaTitle && entity.metaTitle) seo.metaTitle = entity.metaTitle;
  if (!seo.metaDescription && entity.metaDescription) seo.metaDescription = entity.metaDescription;
  return seo;
};

const buildJsonLd = (meta, context = {}) => {
  if (meta.schemaType === 'none') return null;
  if (meta.schemaJson) {
    try {
      return JSON.parse(meta.schemaJson);
    } catch {
      return null;
    }
  }

  const site = context.settings || {};
  const siteUrl = context.siteUrl || '';
  const pageUrl = absoluteUrl(meta.canonicalPath || '/', siteUrl);
  const businessName = site.business_name || site.store_name || 'KoseliXpress';
  const image = meta.ogImageUrl ? absoluteUrl(meta.ogImageUrl, siteUrl) : undefined;
  const base = { '@context': 'https://schema.org' };
  const type = meta.schemaType || 'WebPage';

  if (type === 'Product') {
    const product = context.product || {};
    const inStock = (product.stock ?? 0) > 0;
    return {
      ...base,
      '@type': 'Product',
      name: context.title || product.name || meta.title,
      description: meta.description,
      image: image ? [image] : undefined,
      sku: product.sku || undefined,
      brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
      offers: {
        '@type': 'Offer',
        url: pageUrl,
        priceCurrency: 'NPR',
        price: String(product.price ?? 0),
        availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      },
    };
  }

  if (type === 'BlogPosting' || type === 'Article') {
    return {
      ...base,
      '@type': type,
      headline: context.title || meta.title,
      description: meta.description,
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
      keywords: meta.keywords || undefined,
    };
  }

  if (type === 'LocalBusiness') {
    const payload = {
      ...base,
      '@type': 'LocalBusiness',
      name: businessName,
      description: meta.description,
      url: siteUrl || pageUrl,
      image,
    };
    if (meta.geo?.latitude && meta.geo?.longitude) {
      payload.geo = {
        '@type': 'GeoCoordinates',
        latitude: meta.geo.latitude,
        longitude: meta.geo.longitude,
      };
    }
    return payload;
  }

  return {
    ...base,
    '@type': type,
    name: context.title || meta.title,
    description: meta.description,
    url: pageUrl,
    image,
  };
};

const finalize = ({
  settings,
  siteUrl,
  path,
  seo = {},
  fallbackTitle = '',
  fallbackDescription = '',
  fallbackImage = '',
  fallbackImageAlt = '',
  schemaType,
  ogType = 'website',
  jsonLdContext = {},
  forceNoindex = false,
}) => {
  const title =
    String(seo.metaTitle || fallbackTitle || settings.meta_title || 'KoseliXpress').trim();
  const description = stripHtml(
    String(
      seo.metaDescription
      || fallbackDescription
      || settings.meta_description
      || ''
    )
  ).trim().slice(0, 320);

  const keywordsList = Array.isArray(seo.metaKeywords) && seo.metaKeywords.length
    ? seo.metaKeywords
    : String(settings.meta_keywords || '')
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

  const geo = {
    ...emptyGeo(),
    placename: seo.geo?.placename || settings.geo_placename || '',
    region: seo.geo?.region || settings.geo_region || '',
    country: seo.geo?.country || settings.geo_country || 'Nepal',
    latitude: seo.geo?.latitude || settings.geo_latitude || '',
    longitude: seo.geo?.longitude || settings.geo_longitude || '',
  };

  const rawImage = seo.ogImage?.url || fallbackImage || settings.default_og_image || settings.logo_url || '';
  const ogImageStored = forClientMediaUrl(rawImage, siteUrl) || rawImage;
  const ogImage = absoluteUrl(ogImageStored, siteUrl);
  const robotsIndex = forceNoindex ? false : seo.robotsIndex !== false;
  const robotsFollow = forceNoindex ? false : seo.robotsFollow !== false;

  const resolvedSchemaType = seo.schemaType || schemaType || 'WebPage';
  const metaForLd = {
    title,
    description,
    keywords: keywordsList.join(', '),
    schemaType: resolvedSchemaType,
    schemaJson: seo.schemaJson,
    ogImageUrl: ogImage,
    geo,
    canonicalPath: seo.canonicalUrl || path,
  };

  const canonical = absoluteUrl(seo.canonicalUrl || path, siteUrl);

  return {
    path,
    title,
    description,
    keywords: keywordsList.join(', '),
    robots: `${robotsIndex ? 'index' : 'noindex'}, ${robotsFollow ? 'follow' : 'nofollow'}`,
    canonical,
    ogType,
    ogTitle: String(seo.ogTitle || title).trim(),
    ogDescription: stripHtml(String(seo.ogDescription || description).trim()).slice(0, 320),
    ogImage,
    ogImageAlt: String(seo.ogImage?.alt || fallbackImageAlt || title).trim(),
    twitterCard: seo.twitterCard || 'summary_large_image',
    geo,
    googleSiteVerification: settings.google_site_verification || '',
    bingSiteVerification: settings.bing_site_verification || '',
    jsonLd: buildJsonLd(metaForLd, {
      ...jsonLdContext,
      settings,
      siteUrl,
      title: jsonLdContext.title || title,
    }),
  };
};

const cmsPathForPage = (page) => {
  if (page.pageType === 'home') return '/';
  if (page.pageType === 'about') return '/about';
  if (page.pageType === 'contact') return '/contact';
  return `/p/${page.slug}`;
};

/**
 * Resolve crawler-facing SEO meta for a storefront pathname using admin-managed content.
 */
export const resolveSeoForPath = async (rawPath = '/') => {
  const path = normalizePath(rawPath);
  const settings = await getPublicSettings();
  const siteUrl = (settings.site_url || config.clientUrl || '').replace(/\/$/, '');

  const forceNoindex = NOINDEX_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`)
  );

  if (forceNoindex) {
    return finalize({
      settings,
      siteUrl,
      path,
      fallbackTitle: settings.meta_title || 'KoseliXpress',
      fallbackDescription: settings.meta_description || '',
      forceNoindex: true,
      schemaType: 'none',
    });
  }

  if (path === '/') {
    const home = await CMSPage.findOne({ pageType: 'home', isPublished: true }).lean();
    if (home) {
      return finalize({
        settings,
        siteUrl,
        path: '/',
        seo: mergeEntity(home),
        fallbackTitle: home.title || settings.meta_title,
        fallbackDescription: home.metaDescription || settings.meta_description,
        schemaType: 'WebPage',
        jsonLdContext: { title: home.title },
      });
    }
    return finalize({
      settings,
      siteUrl,
      path: '/',
      fallbackTitle: settings.meta_title,
      fallbackDescription: settings.meta_description,
      schemaType: 'WebPage',
    });
  }

  if (path === '/about' || path === '/contact') {
    const pageType = path.slice(1);
    const page = await CMSPage.findOne({ pageType, isPublished: true }).lean();
    if (page) {
      return finalize({
        settings,
        siteUrl,
        path,
        seo: mergeEntity(page),
        fallbackTitle: page.title,
        fallbackDescription: page.metaDescription || settings.meta_description,
        schemaType: pageType === 'about' ? 'AboutPage' : 'ContactPage',
        jsonLdContext: { title: page.title },
      });
    }
  }

  if (path.startsWith('/p/')) {
    const slug = path.slice(3);
    if (slug) {
      const page = await CMSPage.findOne({ slug, isPublished: true }).lean();
      if (page) {
        return finalize({
          settings,
          siteUrl,
          path: cmsPathForPage(page),
          seo: mergeEntity(page),
          fallbackTitle: page.title,
          fallbackDescription: page.metaDescription || settings.meta_description,
          schemaType: 'WebPage',
          jsonLdContext: { title: page.title },
        });
      }
    }
  }

  if (path === '/shop') {
    return finalize({
      settings,
      siteUrl,
      path: '/shop',
      fallbackTitle: `Shop | ${settings.store_name || 'KoseliXpress'}`,
      fallbackDescription: settings.meta_description || 'Browse gifts, flowers, and cakes with delivery across Nepal.',
      schemaType: 'CollectionPage',
    });
  }

  if (path.startsWith('/shop/category/')) {
    const slug = path.slice('/shop/category/'.length);
    if (slug) {
      const category = await Category.findOne({ slug, isActive: true }).lean();
      if (category) {
        return finalize({
          settings,
          siteUrl,
          path: `/shop/category/${category.slug}`,
          seo: mergeEntity(category),
          fallbackTitle: category.name,
          fallbackDescription: category.description || settings.meta_description,
          fallbackImage: category.image?.url,
          fallbackImageAlt: category.image?.alt || category.name,
          schemaType: 'CollectionPage',
          jsonLdContext: { title: category.name },
        });
      }
    }
  }

  if (path.startsWith('/shop/') && !path.startsWith('/shop/category/')) {
    const slug = path.slice('/shop/'.length);
    if (slug && !slug.includes('/')) {
      const product = await Product.findOne({ slug, isActive: true })
        .select('name slug sku brand price stock images metaTitle metaDescription metaKeywords focusKeyword seo shortDescription description longDescription')
        .lean();
      if (product) {
        const seo = mergeEntity(product);
        if (!seo.metaKeywords?.length && product.metaKeywords?.length) {
          seo.metaKeywords = product.metaKeywords;
        }
        if (!seo.focusKeyword && product.focusKeyword) seo.focusKeyword = product.focusKeyword;
        if (!seo.schemaType) seo.schemaType = 'Product';

        const primaryImage = product.images?.find((i) => i.isPrimary) || product.images?.[0];
        const rawDesc =
          seo.metaDescription
          || product.metaDescription
          || product.shortDescription
          || product.description
          || product.longDescription
          || '';

        return finalize({
          settings,
          siteUrl,
          path: `/shop/${product.slug}`,
          seo,
          fallbackTitle: `${product.name} | Buy Online in Nepal | KoseliXpress`.slice(0, 60),
          fallbackDescription: stripHtml(rawDesc).slice(0, 160),
          fallbackImage: primaryImage?.url,
          fallbackImageAlt: primaryImage?.alt || product.name,
          schemaType: 'Product',
          ogType: 'product',
          jsonLdContext: { title: product.name, product },
        });
      }
    }
  }

  if (path === '/blog') {
    return finalize({
      settings,
      siteUrl,
      path: '/blog',
      fallbackTitle: `Blog | ${settings.store_name || 'KoseliXpress'}`,
      fallbackDescription: 'Gift ideas, occasions, and delivery tips from KoseliXpress.',
      schemaType: 'CollectionPage',
    });
  }

  if (path.startsWith('/blog/')) {
    const slug = path.slice('/blog/'.length);
    if (slug && !slug.includes('/')) {
      const blog = await Blog.findOne({ slug, isPublished: true })
        .populate('author', 'name')
        .lean();
      if (blog) {
        return finalize({
          settings,
          siteUrl,
          path: `/blog/${blog.slug}`,
          seo: mergeEntity(blog),
          fallbackTitle: blog.title,
          fallbackDescription: blog.excerpt || stripHtml(blog.content).slice(0, 160),
          fallbackImage: blog.featuredImage?.url,
          fallbackImageAlt: blog.featuredImage?.alt || blog.title,
          schemaType: 'BlogPosting',
          ogType: 'article',
          jsonLdContext: {
            title: blog.title,
            publishedAt: blog.publishedAt,
            updatedAt: blog.updatedAt,
            authorName: blog.author?.name,
          },
        });
      }
    }
  }

  return finalize({
    settings,
    siteUrl,
    path,
    fallbackTitle: settings.meta_title || 'KoseliXpress',
    fallbackDescription: settings.meta_description || '',
    schemaType: 'WebPage',
  });
};
