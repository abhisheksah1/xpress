import mongoose from 'mongoose';
import { CMS_PAGE_TYPES } from '../config/constants.js';
import { generateSlug } from '../utils/helpers.js';
import { seoMetaSchema, syncLegacySeoFields } from './schemas/seoMeta.schema.js';

const contentBlockSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        'hero',
        'banner',
        'slider',
        'categories_grid',
        'product_grid',
        'image',
        'image_content',
        'video',
        'faq',
        'google_reviews',
        'html_embed',
        'delivery_countdown',
        'text',
        'cta',
        'testimonial',
        'gallery',
        'custom',
      ],
      required: true,
    },
    title: { type: String },
    content: { type: String },
    image: { url: String, publicId: String, alt: String },
    images: [{ url: String, publicId: String, alt: String }],
    buttonText: { type: String },
    buttonLink: { type: String },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    settings: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: true }
);

const cmsPageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true },
    pageType: {
      type: String,
      enum: Object.values(CMS_PAGE_TYPES),
      default: CMS_PAGE_TYPES.CUSTOM,
    },
    blocks: [contentBlockSchema],
    metaTitle: { type: String },
    metaDescription: { type: String },
    seo: { type: seoMetaSchema, default: () => ({}) },
    isPublished: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

cmsPageSchema.pre('save', function (next) {
  if (!this.slug && this.title) this.slug = generateSlug(this.title);
  syncLegacySeoFields(this);
  next();
});

const CMSPage = mongoose.model('CMSPage', cmsPageSchema);
export default CMSPage;
