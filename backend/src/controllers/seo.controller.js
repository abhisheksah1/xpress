import { asyncHandler } from '../utils/asyncHandler.js';
import * as seoService from '../services/seo.service.js';
import { resolveSeoForPath } from '../services/seoResolve.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';

export const robotsTxt = asyncHandler(async (req, res) => {
  const body = await seoService.buildRobotsTxt();
  res.type('text/plain').send(body);
});

export const sitemapXml = asyncHandler(async (req, res) => {
  const body = await seoService.buildSitemapXml();
  res.type('application/xml').send(body);
});

/** Public SEO meta for a storefront path — used by Vite HTML inject and crawlers. */
export const seoMetaForPath = asyncHandler(async (req, res) => {
  const path = req.query.path || req.query.url || '/';
  const meta = await resolveSeoForPath(path);
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  res.json(new ApiResponse(200, meta));
});
