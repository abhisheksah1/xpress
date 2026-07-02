import { Blog } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

export const createBlog = async (data, authorId) => {
  return Blog.create({ ...data, author: authorId });
};

export const getBlogs = async ({ page = 1, limit = 10, isPublished, search, tag }) => {
  const filter = {};
  if (isPublished !== undefined) filter.isPublished = isPublished === 'true' || isPublished === true;
  if (tag) filter.tags = tag;
  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { excerpt: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [blogs, total] = await Promise.all([
    Blog.find(filter)
      .populate('author', 'name avatar')
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Blog.countDocuments(filter),
  ]);

  return { blogs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getBlogBySlug = async (slug) => {
  const blog = await Blog.findOneAndUpdate(
    { slug, isPublished: true },
    { $inc: { viewCount: 1 } },
    { new: true }
  ).populate('author', 'name avatar');
  if (!blog) throw new ApiError(404, 'Blog not found');
  return blog;
};

export const getBlogById = async (id) => {
  const blog = await Blog.findById(id).populate('author', 'name email');
  if (!blog) throw new ApiError(404, 'Blog not found');
  return blog;
};

export const updateBlog = async (id, data) => {
  const blog = await Blog.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!blog) throw new ApiError(404, 'Blog not found');
  return blog;
};

export const deleteBlog = async (id) => {
  const blog = await Blog.findByIdAndDelete(id);
  if (!blog) throw new ApiError(404, 'Blog not found');
};
