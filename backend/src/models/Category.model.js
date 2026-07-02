import mongoose from 'mongoose';
import { generateSlug } from '../utils/helpers.js';
import { deliveryGroupRuleSchema } from './schemas/deliveryGroupRule.schema.js';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true },
    description: { type: String },
    image: {
      url: { type: String },
      publicId: { type: String },
      alt: { type: String },
    },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    deliveryScope: {
      type: String,
      enum: ['all', 'selected'],
      default: 'all',
    },
    deliveryGroupRules: [deliveryGroupRuleSchema],
    metaTitle: { type: String },
    metaDescription: { type: String },
  },
  { timestamps: true }
);

categorySchema.pre('save', function (next) {
  if (!this.slug && this.name) {
    this.slug = generateSlug(this.name);
  }
  next();
});

const Category = mongoose.model('Category', categorySchema);
export default Category;
