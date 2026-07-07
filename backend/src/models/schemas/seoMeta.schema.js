import mongoose from 'mongoose';

export const seoImageSchema = new mongoose.Schema(
  {
    url: { type: String },
    publicId: { type: String },
    alt: { type: String },
  },
  { _id: false }
);

export const seoGeoSchema = new mongoose.Schema(
  {
    placename: { type: String },
    region: { type: String },
    country: { type: String, default: 'Nepal' },
    latitude: { type: String },
    longitude: { type: String },
  },
  { _id: false }
);

export const seoMetaSchema = new mongoose.Schema(
  {
    metaTitle: { type: String, maxlength: 160 },
    metaDescription: { type: String, maxlength: 320 },
    focusKeyword: { type: String },
    metaKeywords: [{ type: String, trim: true }],
    ogTitle: { type: String, maxlength: 160 },
    ogDescription: { type: String, maxlength: 320 },
    ogImage: seoImageSchema,
    twitterCard: { type: String, enum: ['summary', 'summary_large_image'], default: 'summary_large_image' },
    canonicalUrl: { type: String },
    robotsIndex: { type: Boolean, default: true },
    robotsFollow: { type: Boolean, default: true },
    schemaType: {
      type: String,
      enum: [
        'WebPage',
        'Article',
        'BlogPosting',
        'FAQPage',
        'AboutPage',
        'ContactPage',
        'CollectionPage',
        'LocalBusiness',
        'none',
      ],
      default: 'WebPage',
    },
    schemaJson: { type: String },
    geo: seoGeoSchema,
  },
  { _id: false }
);

export const syncLegacySeoFields = (doc) => {
  if (!doc) return;
  if (!doc.seo || typeof doc.seo !== 'object') doc.seo = {};
  if (doc.metaTitle && !doc.seo.metaTitle) doc.seo.metaTitle = doc.metaTitle;
  if (doc.metaDescription && !doc.seo.metaDescription) doc.seo.metaDescription = doc.metaDescription;
  if (doc.seo.metaTitle) doc.metaTitle = doc.seo.metaTitle;
  if (doc.seo.metaDescription) doc.metaDescription = doc.seo.metaDescription;
};
