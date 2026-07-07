import mongoose from 'mongoose';
import { generateSlug } from '../utils/helpers.js';
import { seoMetaSchema, syncLegacySeoFields } from './schemas/seoMeta.schema.js';

const blogSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true },
    excerpt: { type: String },
    content: { type: String, required: true },
    featuredImage: {
      url: { type: String },
      publicId: { type: String },
      alt: { type: String },
    },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    tags: [{ type: String, trim: true }],
    category: { type: String },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date },
    metaTitle: { type: String },
    metaDescription: { type: String },
    seo: { type: seoMetaSchema, default: () => ({}) },
    viewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

blogSchema.pre('save', function (next) {
  if (!this.slug && this.title) this.slug = generateSlug(this.title);
  if (this.isPublished && !this.publishedAt) this.publishedAt = new Date();
  syncLegacySeoFields(this);
  if (!this.seo?.schemaType) {
    if (!this.seo) this.seo = {};
    this.seo.schemaType = 'BlogPosting';
  }
  next();
});

const Blog = mongoose.model('Blog', blogSchema);
export default Blog;
