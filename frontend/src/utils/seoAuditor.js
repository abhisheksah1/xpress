export function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateSkuPreview() {
  return `SKU-${Math.floor(10000 + Math.random() * 90000)}`;
}

export function generateSeoFields(form) {
  const keyword = form.focusKeyword || form.name;
  const metaTitle = form.metaTitle || `${form.name} | Buy Online in Nepal | KoseliXpress`.slice(0, 60);
  const descSource = form.longDescription || form.description || form.shortDescription || '';
  const metaDescription =
    form.metaDescription ||
    `Shop ${form.name} at KoseliXpress Nepal. ${descSource}`.replace(/\s+/g, ' ').trim().slice(0, 160);
  const metaKeywords = form.metaKeywords?.length
    ? form.metaKeywords
    : [keyword, form.brand, ...(form.tags || [])].filter(Boolean);

  return { metaTitle, metaDescription, metaKeywords };
}

export function auditSeo(form, images = []) {
  const checks = [];
  let score = 0;
  const maxPerCategory = { meta: 20, content: 20, title: 20, media: 20, links: 20 };
  const breakdown = { meta: 0, content: 0, title: 0, media: 0, links: 0 };

  const metaTitle = form.metaTitle || '';
  const metaDesc = form.metaDescription || '';
  const content = form.longDescription || form.description || '';
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  const keyword = (form.focusKeyword || '').toLowerCase();

  if (metaTitle.length >= 50 && metaTitle.length <= 60) {
    breakdown.meta += 10;
    checks.push({ ok: true, text: 'Meta title is 50–60 characters' });
  } else {
    checks.push({ ok: false, text: `Meta title should be 50–60 chars (currently ${metaTitle.length})` });
  }

  if (metaDesc.length >= 120 && metaDesc.length <= 160) {
    breakdown.meta += 10;
    checks.push({ ok: true, text: 'Meta description is 120–160 characters' });
  } else {
    checks.push({ ok: false, text: `Meta description should be 120–160 chars (currently ${metaDesc.length})` });
  }

  if (wordCount >= 150) {
    breakdown.content += 20;
    checks.push({ ok: true, text: `Content length is good (${wordCount} words)` });
  } else {
    checks.push({ ok: false, text: `Content is brief (${wordCount} words, aim for 150+)` });
  }

  if (form.name?.trim()) {
    breakdown.title += 10;
    checks.push({ ok: true, text: 'Product title is set (H1 equivalent)' });
  } else {
    checks.push({ ok: false, text: 'Missing primary product title' });
  }

  if (keyword && metaTitle.toLowerCase().includes(keyword)) {
    breakdown.title += 10;
    checks.push({ ok: true, text: 'Focus keyword appears in meta title' });
  } else if (keyword) {
    checks.push({ ok: false, text: 'Focus keyword missing from meta title' });
  } else {
    checks.push({ ok: false, text: 'No focus keyword set' });
  }

  if (images.length > 0) {
    breakdown.media += 20;
    checks.push({ ok: true, text: `${images.length} media asset(s) attached` });
  } else {
    checks.push({ ok: false, text: 'No product images added' });
  }

  if (keyword && content.toLowerCase().includes(keyword)) {
    breakdown.links += 10;
    checks.push({ ok: true, text: 'Focus keyword used in content' });
  } else if (keyword) {
    checks.push({ ok: false, text: 'Focus keyword not found in content' });
  }

  if (form.slug?.trim()) {
    breakdown.links += 10;
    checks.push({ ok: true, text: 'URL slug is configured' });
  } else {
    checks.push({ ok: false, text: 'URL slug is missing' });
  }

  score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const rating = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';

  return { score, breakdown, checks, rating, wordCount };
}

function stripToText(value = '') {
  return String(value || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(text = '') {
  return stripToText(text).split(/\s+/).filter(Boolean).length;
}

function countHeadings(html = '') {
  const h1 = (String(html).match(/<h1\b/gi) || []).length;
  const h2 = (String(html).match(/<h2\b/gi) || []).length;
  return { h1, h2 };
}

function countImagesWithAlt(html = '', extraImages = []) {
  const imgTags = String(html).match(/<img\b[^>]*>/gi) || [];
  let withAlt = 0;
  imgTags.forEach((tag) => {
    const alt = tag.match(/\balt\s*=\s*("([^"]*)"|'([^']*)')/i);
    if (alt && (alt[2] || alt[3] || '').trim()) withAlt += 1;
  });
  extraImages.forEach((img) => {
    if (img?.url) {
      if ((img.alt || '').trim()) withAlt += 1;
    }
  });
  return { total: imgTags.length + extraImages.filter((i) => i?.url).length, withAlt };
}

/**
 * Real-time SEO audit for CMS pages and blog posts.
 * @param {object} seo - nested seo meta object
 * @param {object} context - { title, contentHtml, slug, excerpt, images: [{url,alt}], type: 'page'|'blog' }
 */
export function auditContentSeo(seo = {}, context = {}) {
  const checks = [];
  const breakdown = { meta: 0, content: 0, title: 0, media: 0, links: 0 };

  const metaTitle = (seo.metaTitle || '').trim();
  const metaDesc = (seo.metaDescription || '').trim();
  const keyword = (seo.focusKeyword || '').trim().toLowerCase();
  const pageTitle = (context.title || '').trim();
  const contentHtml = context.contentHtml || context.content || '';
  const contentText = stripToText([contentHtml, context.excerpt, pageTitle].filter(Boolean).join(' '));
  const wordCount = countWords(contentText);
  const { h1, h2 } = countHeadings(contentHtml);
  const images = Array.isArray(context.images) ? context.images : [];
  const imageStats = countImagesWithAlt(contentHtml, images);
  const hasOgImage = !!(seo.ogImage?.url);
  const hasCanonical = !!(seo.canonicalUrl || context.canonicalPreview);
  const slug = (context.slug || '').trim();
  const label = context.type === 'blog' ? 'post' : 'page';

  // Meta (20)
  if (metaTitle.length >= 50 && metaTitle.length <= 60) {
    breakdown.meta += 10;
    checks.push({ ok: true, text: 'Meta title is 50–60 characters' });
  } else if (metaTitle) {
    checks.push({ ok: false, text: `Meta title should be 50–60 chars (currently ${metaTitle.length})` });
  } else {
    checks.push({ ok: false, text: 'Meta title is missing' });
  }

  if (metaDesc.length >= 120 && metaDesc.length <= 160) {
    breakdown.meta += 10;
    checks.push({ ok: true, text: 'Meta description is 120–160 characters' });
  } else if (metaDesc) {
    checks.push({ ok: false, text: `Meta description should be 120–160 chars (currently ${metaDesc.length})` });
  } else {
    checks.push({ ok: false, text: 'Meta description is missing' });
  }

  // Content (20)
  const minWords = context.type === 'blog' ? 300 : 150;
  if (wordCount >= minWords) {
    breakdown.content += 12;
    checks.push({ ok: true, text: `Content length is good (${wordCount} words)` });
  } else {
    checks.push({ ok: false, text: `Content is brief (${wordCount} words, aim for ${minWords}+)` });
  }

  if (h1 >= 1 || pageTitle) {
    breakdown.content += 4;
    checks.push({ ok: true, text: h1 >= 1 ? 'H1 heading found in content' : `${label} title can act as H1` });
  } else {
    checks.push({ ok: false, text: 'Add an H1 heading or set a clear page title' });
  }

  if (h2 >= 1) {
    breakdown.content += 4;
    checks.push({ ok: true, text: `Subheadings found (${h2} H2)` });
  } else if (wordCount >= 80) {
    checks.push({ ok: false, text: 'Add H2 subheadings to structure longer content' });
  } else {
    checks.push({ ok: true, text: 'Short content — H2 optional' });
    breakdown.content += 4;
  }

  // Title / keyword (20)
  if (pageTitle) {
    breakdown.title += 8;
    checks.push({ ok: true, text: `${label[0].toUpperCase()}${label.slice(1)} title is set` });
  } else {
    checks.push({ ok: false, text: `Missing ${label} title` });
  }

  if (keyword) {
    breakdown.title += 4;
    checks.push({ ok: true, text: 'Focus keyword is set' });
    if (metaTitle.toLowerCase().includes(keyword)) {
      breakdown.title += 4;
      checks.push({ ok: true, text: 'Focus keyword appears in meta title' });
    } else {
      checks.push({ ok: false, text: 'Focus keyword missing from meta title' });
    }
    if (metaDesc.toLowerCase().includes(keyword)) {
      breakdown.title += 4;
      checks.push({ ok: true, text: 'Focus keyword appears in meta description' });
    } else {
      checks.push({ ok: false, text: 'Focus keyword missing from meta description' });
    }
  } else {
    checks.push({ ok: false, text: 'No focus keyword set' });
  }

  // Media (20)
  if (imageStats.total > 0 || hasOgImage) {
    breakdown.media += 10;
    checks.push({
      ok: true,
      text: hasOgImage
        ? `OG image set${imageStats.total ? ` · ${imageStats.total} content image(s)` : ''}`
        : `${imageStats.total} content image(s) found`,
    });
  } else {
    checks.push({ ok: false, text: 'Add an OG image or content images' });
  }

  if (hasOgImage && (seo.ogImage?.alt || '').trim()) {
    breakdown.media += 5;
    checks.push({ ok: true, text: 'OG image has alt text' });
  } else if (hasOgImage) {
    checks.push({ ok: false, text: 'Add alt text to OG image' });
  }

  if (imageStats.total === 0 || imageStats.withAlt >= Math.min(imageStats.total, 1)) {
    breakdown.media += 5;
    if (imageStats.total > 0) {
      checks.push({ ok: true, text: `Images with alt text: ${imageStats.withAlt}/${imageStats.total}` });
    } else if (hasOgImage) {
      checks.push({ ok: true, text: 'Social preview image configured' });
    }
  } else {
    checks.push({ ok: false, text: `Add alt text to images (${imageStats.withAlt}/${imageStats.total} have alt)` });
  }

  // Links / technical (20)
  if (keyword && contentText.toLowerCase().includes(keyword)) {
    breakdown.links += 8;
    checks.push({ ok: true, text: 'Focus keyword used in body content' });
  } else if (keyword) {
    checks.push({ ok: false, text: 'Focus keyword not found in body content' });
  }

  if (slug || hasCanonical) {
    breakdown.links += 6;
    checks.push({ ok: true, text: slug ? 'URL slug is configured' : 'Canonical URL is set' });
  } else {
    checks.push({ ok: false, text: 'Set a URL slug or canonical URL' });
  }

  if (seo.schemaType && seo.schemaType !== 'none') {
    breakdown.links += 6;
    checks.push({ ok: true, text: `Schema type: ${seo.schemaType}` });
  } else {
    checks.push({ ok: false, text: 'Enable a schema type for structured data' });
  }

  const score = Object.values(breakdown).reduce((a, b) => a + b, 0);
  const rating = score >= 80 ? 'Excellent' : score >= 60 ? 'Good' : score >= 40 ? 'Fair' : 'Poor';

  return { score, breakdown, checks, rating, wordCount };
}

/** Collect plain/HTML content + images from CMS page builder blocks for SEO audit. */
export function collectCmsBlocksAuditContext(blocks = [], page = {}) {
  const parts = [];
  const images = [];

  (blocks || []).forEach((block) => {
    if (block.title) parts.push(block.title);
    if (block.content) parts.push(block.content);
    if (block.settings?.html) parts.push(block.settings.html);
    if (block.settings?.subtitle) parts.push(block.settings.subtitle);
    (block.settings?.sections || []).forEach((s) => {
      if (s.text) parts.push(s.text);
      if (s.image?.url) images.push({ url: s.image.url, alt: s.image.alt || '' });
    });
    (block.settings?.items || []).forEach((item) => {
      if (item.q) parts.push(item.q);
      if (item.a) parts.push(item.a);
    });
    if (block.image?.url) images.push({ url: block.image.url, alt: block.image.alt || '' });
    (block.images || []).forEach((img) => {
      if (img?.url) images.push({ url: img.url, alt: img.alt || '' });
    });
  });

  return {
    type: 'page',
    title: page.title || '',
    slug: page.slug || '',
    contentHtml: parts.join('\n'),
    images,
  };
}
