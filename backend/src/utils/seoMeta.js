import { z } from 'zod';

export const seoImageZod = z.object({
  url: z.string().optional(),
  publicId: z.string().optional(),
  alt: z.string().optional(),
}).optional();

export const seoGeoZod = z.object({
  placename: z.string().optional(),
  region: z.string().optional(),
  country: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
}).optional();

export const seoMetaZod = z.object({
  metaTitle: z.string().max(160).optional(),
  metaDescription: z.string().max(320).optional(),
  focusKeyword: z.string().max(120).optional(),
  metaKeywords: z.array(z.string().max(80)).optional(),
  ogTitle: z.string().max(160).optional(),
  ogDescription: z.string().max(320).optional(),
  ogImage: seoImageZod,
  twitterCard: z.enum(['summary', 'summary_large_image']).optional(),
  canonicalUrl: z.string().max(500).optional(),
  robotsIndex: z.boolean().optional(),
  robotsFollow: z.boolean().optional(),
  schemaType: z.enum([
    'WebPage',
    'Article',
    'BlogPosting',
    'FAQPage',
    'AboutPage',
    'ContactPage',
    'CollectionPage',
    'LocalBusiness',
    'none',
  ]).optional(),
  schemaJson: z.string().max(10000).optional(),
  geo: seoGeoZod,
}).optional();

export const mergeSeoPayload = (body = {}) => {
  const seo = body.seo && typeof body.seo === 'object' ? { ...body.seo } : {};
  if (body.metaTitle !== undefined) seo.metaTitle = body.metaTitle;
  if (body.metaDescription !== undefined) seo.metaDescription = body.metaDescription;
  return {
    ...body,
    seo,
    metaTitle: seo.metaTitle ?? body.metaTitle,
    metaDescription: seo.metaDescription ?? body.metaDescription,
  };
};
