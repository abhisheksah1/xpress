import * as blogService from '../../services/blog.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getBlogs = asyncHandler(async (req, res) => {
  const result = await blogService.getBlogs({ ...req.query, isPublished: true });
  res.json(new ApiResponse(200, result));
});

export const getBlog = asyncHandler(async (req, res) => {
  const blog = await blogService.getBlogBySlug(req.params.slug);
  res.json(new ApiResponse(200, blog));
});
