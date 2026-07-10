import Media from '../models/Media.model.js';
import * as uploadService from './upload.service.js';
import { ApiError } from '../utils/ApiError.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const normalizeTags = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return [...new Set(raw.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean))];
  }
  return [
    ...new Set(
      String(raw)
        .split(/[,;]+/)
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
};

const buildSearchFilter = ({ q, category, tag }) => {
  const filter = {};
  if (category) filter.category = String(category).trim().toLowerCase();
  if (tag) filter.tags = String(tag).trim().toLowerCase();

  const query = String(q || '').trim();
  if (query) {
    const regex = new RegExp(escapeRegex(query), 'i');
    filter.$or = [
      { searchText: regex },
      { alt: regex },
      { filename: regex },
      { sourceLabel: regex },
      { category: regex },
      { tags: regex },
    ];
  }

  return filter;
};

export const recordMediaAsset = async (uploadResult, meta = {}, uploadedBy) => {
  const { url, publicId, width, height, format } = uploadResult;
  if (!url) throw new ApiError(400, 'Media URL is required');

  const tags = normalizeTags(meta.tags);
  const category = meta.category ? String(meta.category).trim().toLowerCase() : '';
  const sourceContext = meta.sourceContext ? String(meta.sourceContext).trim() : '';
  const sourceLabel = meta.sourceLabel ? String(meta.sourceLabel).trim() : '';
  const alt = meta.alt ? String(meta.alt).trim() : '';
  const filename = meta.filename ? String(meta.filename).trim() : '';

  const existing = publicId
    ? await Media.findOne({ publicId })
    : await Media.findOne({ url });

  if (existing) {
    if (alt && !existing.alt) existing.alt = alt;
    if (filename && !existing.filename) existing.filename = filename;
    if (category) existing.category = category;
    if (sourceContext) existing.sourceContext = sourceContext;
    if (sourceLabel) existing.sourceLabel = sourceLabel;
    if (tags.length) {
      existing.tags = [...new Set([...(existing.tags || []), ...tags])];
    }
    if (uploadedBy) existing.uploadedBy = uploadedBy;
    await existing.save();
    return existing;
  }

  return Media.create({
    url,
    publicId: publicId || undefined,
    alt,
    filename,
    format: format || '',
    width,
    height,
    sizeBytes: meta.sizeBytes,
    tags,
    category,
    sourceContext,
    sourceLabel,
    uploadedBy,
  });
};

export const listMedia = async ({ page = 1, limit = 24, q, category, tag }) => {
  const filter = buildSearchFilter({ q, category, tag });
  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 24));
  const skip = (pageNum - 1) * limitNum;

  const [items, total, categories] = await Promise.all([
    Media.find(filter)
      .populate('uploadedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Media.countDocuments(filter),
    Media.distinct('category', { category: { $ne: '' } }),
  ]);

  return {
    items,
    categories: categories.filter(Boolean).sort(),
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum) || 1,
    },
  };
};

export const getMediaById = async (id) => {
  const item = await Media.findById(id).populate('uploadedBy', 'name email');
  if (!item) throw new ApiError(404, 'Media not found');
  return item;
};

export const updateMedia = async (id, payload) => {
  const item = await Media.findById(id);
  if (!item) throw new ApiError(404, 'Media not found');

  if (payload.alt !== undefined) item.alt = String(payload.alt || '').trim();
  if (payload.category !== undefined) {
    item.category = payload.category ? String(payload.category).trim().toLowerCase() : '';
  }
  if (payload.sourceLabel !== undefined) {
    item.sourceLabel = payload.sourceLabel ? String(payload.sourceLabel).trim() : '';
  }
  if (payload.sourceContext !== undefined) {
    item.sourceContext = payload.sourceContext ? String(payload.sourceContext).trim() : '';
  }
  if (payload.tags !== undefined) item.tags = normalizeTags(payload.tags);

  await item.save();
  return item;
};

export const deleteMedia = async (id) => {
  const item = await Media.findById(id);
  if (!item) throw new ApiError(404, 'Media not found');

  if (item.publicId) {
    await uploadService.deleteImage(item.publicId);
  }

  await item.deleteOne();
  return item;
};
