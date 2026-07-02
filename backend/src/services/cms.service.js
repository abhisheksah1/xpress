import { CMSPage } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

export const createPage = async (data, userId) => {
  return CMSPage.create({ ...data, updatedBy: userId });
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

export const getPageById = async (id) => {
  const page = await CMSPage.findById(id);
  if (!page) throw new ApiError(404, 'Page not found');
  return page;
};

export const updatePage = async (id, data, userId) => {
  const page = await CMSPage.findByIdAndUpdate(
    id,
    { ...data, updatedBy: userId },
    { new: true, runValidators: true }
  );
  if (!page) throw new ApiError(404, 'Page not found');
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
  page.updatedBy = userId;
  await page.save();
  return page;
};
