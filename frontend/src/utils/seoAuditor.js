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
