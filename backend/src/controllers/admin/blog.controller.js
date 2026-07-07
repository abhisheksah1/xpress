import * as blogService from '../../services/blog.service.js';
import { mergeSeoPayload } from '../../utils/seoMeta.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const createBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.createBlog(mergeSeoPayload(req.validated.body), req.user._id);
  res.status(201).json(new ApiResponse(201, blog, 'Blog created'));
});

export const getBlogs = asyncHandler(async (req, res) => {
  const result = await blogService.getBlogs(req.query);
  res.json(new ApiResponse(200, result));
});

export const getBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.getBlogById(req.params.id);
  res.json(new ApiResponse(200, blog));
});

export const updateBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.updateBlog(req.params.id, mergeSeoPayload(req.validated.body));
  res.json(new ApiResponse(200, blog, 'Blog updated'));
});

export const deleteBlog = asyncHandler(async (req, res) => {
  await blogService.deleteBlog(req.params.id);
  res.json(new ApiResponse(200, null, 'Blog deleted'));
});
