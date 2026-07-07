import { CMSPage } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { CMS_PAGE_TYPES } from '../config/constants.js';
import { DEFAULT_HOME_PAGE } from '../config/defaultHomePage.js';

const RESERVED_SLUGS = new Set(['home', 'shop', 'cart', 'checkout', 'login', 'register', 'admin', 'blog', 'orders', 'track', 'reminders']);

const isReservedSlugAllowed = (slug, pageType) =>
  pageType === CMS_PAGE_TYPES.HOME && slug === 'home';

const assertUniqueSlug = async (slug, excludeId = null, pageType = null) => {
  if (!slug) throw new ApiError(400, 'Slug is required');
  if (RESERVED_SLUGS.has(slug) && !isReservedSlugAllowed(slug, pageType)) {
    throw new ApiError(400, `Slug "${slug}" is reserved`);
  }
  const filter = { slug };
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await CMSPage.findOne(filter);
  if (existing) throw new ApiError(409, 'A page with this slug already exists');
};

const assertUniquePageType = async (pageType, excludeId = null) => {
  const singletonTypes = [
    CMS_PAGE_TYPES.HOME,
    CMS_PAGE_TYPES.ABOUT,
    CMS_PAGE_TYPES.CONTACT,
    CMS_PAGE_TYPES.FAQ,
    CMS_PAGE_TYPES.TERMS,
    CMS_PAGE_TYPES.PRIVACY,
  ];
  if (!singletonTypes.includes(pageType)) return;

  const filter = { pageType };
  if (excludeId) filter._id = { $ne: excludeId };
  const existing = await CMSPage.findOne(filter);
  if (existing) {
    throw new ApiError(409, `A ${pageType} page already exists. Edit or delete it first.`);
  }
};

export const createPage = async (data, userId) => {
  const slug = data.slug?.trim().toLowerCase();
  await assertUniqueSlug(slug, null, data.pageType);
  await assertUniquePageType(data.pageType);

  return CMSPage.create({
    ...data,
    slug,
    blocks: data.blocks || [],
    isPublished: data.isPublished !== false,
    updatedBy: userId,
  });
};

const SINGLETON_PAGE_TYPES = [
  CMS_PAGE_TYPES.HOME,
  CMS_PAGE_TYPES.ABOUT,
  CMS_PAGE_TYPES.CONTACT,
  CMS_PAGE_TYPES.FAQ,
  CMS_PAGE_TYPES.TERMS,
  CMS_PAGE_TYPES.PRIVACY,
];

const suggestCloneSlug = async (baseSlug) => {
  const root = String(baseSlug || 'page').replace(/-copy(-\d+)?$/, '');
  let candidate = `${root}-copy`;
  let n = 2;
  while (await CMSPage.findOne({ slug: candidate })) {
    candidate = `${root}-copy-${n}`;
    n += 1;
  }
  return candidate;
};

const cloneBlocks = (blocks = []) =>
  blocks.map((block) => {
    const plain = typeof block.toObject === 'function' ? block.toObject() : { ...block };
    const { _id, ...rest } = plain;
    return rest;
  });

export const clonePage = async (id, data = {}, userId) => {
  const source = await CMSPage.findById(id);
  if (!source) throw new ApiError(404, 'Page not found');

  let pageType = data.pageType || source.pageType;
  if (SINGLETON_PAGE_TYPES.includes(pageType)) {
    pageType = CMS_PAGE_TYPES.CUSTOM;
  }

  const slug = data.slug?.trim().toLowerCase() || await suggestCloneSlug(source.slug);
  await assertUniqueSlug(slug, null, pageType);
  if (SINGLETON_PAGE_TYPES.includes(pageType)) {
    await assertUniquePageType(pageType);
  }

  const title = data.title?.trim() || `${source.title} (Copy)`;

  return CMSPage.create({
    title,
    slug,
    pageType,
    blocks: cloneBlocks(source.blocks),
    metaTitle: data.seo?.metaTitle || source.metaTitle,
    metaDescription: data.seo?.metaDescription || source.metaDescription,
    seo: data.seo || source.seo,
    isPublished: data.isPublished === true,
    updatedBy: userId,
  });
};

export const getPages = async ({ pageType, isPublished }) => {
  const filter = {};
  if (pageType) filter.pageType = pageType;
  if (isPublished !== undefined) filter.isPublished = isPublished;
  return CMSPage.find(filter).sort({ updatedAt: -1 });
};

export const getPageBySlug = async (slug) => {
  const page = await CMSPage.findOne({ slug, isPublished: true });
  if (!page) throw new ApiError(404, 'Page not found');
  return page;
};

export const getPageByType = async (pageType) => {
  const page = await CMSPage.findOne({ pageType, isPublished: true }).sort({ updatedAt: -1 });
  if (!page) throw new ApiError(404, 'Page not found');
  return page;
};

export const getPageById = async (id) => {
  const page = await CMSPage.findById(id);
  if (!page) throw new ApiError(404, 'Page not found');
  return page;
};

export const updatePage = async (id, data, userId) => {
  const page = await CMSPage.findById(id);
  if (!page) throw new ApiError(404, 'Page not found');

  if (data.slug && data.slug !== page.slug) {
    await assertUniqueSlug(data.slug.trim().toLowerCase(), id, data.pageType || page.pageType);
  }
  if (data.pageType && data.pageType !== page.pageType) {
    await assertUniquePageType(data.pageType, id);
  }

  Object.assign(page, {
    ...data,
    slug: data.slug ? data.slug.trim().toLowerCase() : page.slug,
    updatedBy: userId,
  });
  await page.save();
  return page;
};

export const deletePage = async (id) => {
  const page = await CMSPage.findByIdAndDelete(id);
  if (!page) throw new ApiError(404, 'Page not found');
};

export const updatePageBlocks = async (id, blocks, userId) => {
  const page = await CMSPage.findById(id);
  if (!page) throw new ApiError(404, 'Page not found');
  page.blocks = blocks;
  page.isPublished = true;
  page.updatedBy = userId;
  await page.save();
  return page;
};

export const ensureDefaultHomePage = async (userId) => {
  let page = await CMSPage.findOne({ pageType: CMS_PAGE_TYPES.HOME });

  if (page) {
    if (!page.blocks?.length) {
      page.blocks = DEFAULT_HOME_PAGE.blocks;
      page.isPublished = true;
      page.updatedBy = userId;
      await page.save();
      return { page, created: false, restored: true };
    }
    return { page, created: false, restored: false };
  }

  page = await CMSPage.create({
    ...DEFAULT_HOME_PAGE,
    updatedBy: userId,
  });
  return { page, created: true, restored: false };
};
