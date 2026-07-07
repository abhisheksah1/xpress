import { asyncHandler } from '../utils/asyncHandler.js';
import * as seoService from '../services/seo.service.js';

export const robotsTxt = asyncHandler(async (req, res) => {
  const body = await seoService.buildRobotsTxt();
  res.type('text/plain').send(body);
});

export const sitemapXml = asyncHandler(async (req, res) => {
  const body = await seoService.buildSitemapXml();
  res.type('application/xml').send(body);
});
