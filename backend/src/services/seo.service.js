import { Product, Category, Blog, CMSPage } from '../models/index.js';
import { getPublicSettings } from './settings.service.js';
import config from '../config/index.js';

const cmsPathForPage = (page) => {
  if (page.pageType === 'home') return '/';
  if (page.pageType === 'about') return '/about';
  if (page.pageType === 'contact') return '/contact';
  return `/p/${page.slug}`;
};

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const urlEntry = (loc, lastmod, changefreq = 'weekly', priority = '0.7') => {
  const lines = ['  <url>', `    <loc>${escapeXml(loc)}</loc>`];
  if (lastmod) {
    lines.push(`    <lastmod>${new Date(lastmod).toISOString().split('T')[0]}</lastmod>`);
  }
  lines.push(`    <changefreq>${changefreq}</changefreq>`);
  lines.push(`    <priority>${priority}</priority>`);
  lines.push('  </url>');
  return lines.join('\n');
};

const resolveSiteUrl = async () => {
  const settings = await getPublicSettings();
  return (settings.site_url || config.clientUrl || '').replace(/\/$/, '');
};

export const buildRobotsTxt = async () => {
  const baseUrl = await resolveSiteUrl();
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/
Disallow: /cart
Disallow: /checkout
Disallow: /login
Disallow: /register
Disallow: /orders
Disallow: /track
Disallow: /reminders

Sitemap: ${baseUrl}/sitemap.xml
`;
};

export const buildSitemapXml = async () => {
  const baseUrl = await resolveSiteUrl();
  if (!baseUrl) {
    throw new Error('Configure site_url in Admin → Settings → SEO before generating sitemap');
  }

  const urls = [];
  const seenPaths = new Set();

  const addUrl = (path, lastmod, changefreq, priority) => {
    const normalized = path === '/' ? '/' : path.replace(/\/+$/, '') || '/';
    if (seenPaths.has(normalized)) return;
    seenPaths.add(normalized);
    urls.push(urlEntry(`${baseUrl}${normalized === '/' ? '/' : normalized}`, lastmod, changefreq, priority));
  };

  addUrl('/shop', new Date(), 'daily', '0.9');
  addUrl('/blog', new Date(), 'weekly', '0.8');

  const [categories, products, blogs, pages] = await Promise.all([
    Category.find({ isActive: true }).select('slug updatedAt seo').lean(),
    Product.find({ isActive: true }).select('slug updatedAt').lean(),
    Blog.find({ isPublished: true }).select('slug updatedAt publishedAt').lean(),
    CMSPage.find({ isPublished: true }).select('slug pageType updatedAt seo').lean(),
  ]);

  for (const page of pages) {
    if (page.seo?.robotsIndex === false) continue;
    const path = cmsPathForPage(page);
    const priority = page.pageType === 'home' ? '1.0' : '0.7';
    addUrl(path, page.updatedAt, page.pageType === 'home' ? 'daily' : 'weekly', priority);
  }

  if (!seenPaths.has('/')) {
    addUrl('/', new Date(), 'daily', '1.0');
  }

  for (const cat of categories) {
    if (!cat.slug || cat.seo?.robotsIndex === false) continue;
    addUrl(`/shop/category/${cat.slug}`, cat.updatedAt, 'weekly', '0.8');
  }

  for (const product of products) {
    if (!product.slug) continue;
    addUrl(`/shop/${product.slug}`, product.updatedAt, 'weekly', '0.7');
  }

  for (const blog of blogs) {
    if (!blog.slug) continue;
    addUrl(`/blog/${blog.slug}`, blog.updatedAt || blog.publishedAt, 'monthly', '0.6');
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
};
