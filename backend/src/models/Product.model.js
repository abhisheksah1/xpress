import mongoose from 'mongoose';
import { generateSlug, generateSKU } from '../utils/helpers.js';

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    alt: { type: String },
    isPrimary: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true }
);

const variantSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sku: { type: String },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    attributes: { type: Map, of: String },
    image: { url: String, publicId: String },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const optionCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    options: [{ label: { type: String, required: true }, priceAdjustment: { type: Number, default: 0 } }],
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true },
    sku: { type: String, unique: true },
    description: { type: String },
    shortDescription: { type: String },
    longDescription: { type: String },
    additionalNote: { type: String },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    brand: { type: String, trim: true },
    tags: [{ type: String, trim: true }],
    images: [imageSchema],
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    costPrice: { type: Number, min: 0 },
    stock: { type: Number, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 5 },
    variants: [variantSchema],
    optionCategories: [optionCategorySchema],
    deliveryZones: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryZone' }],
    isGiftWrappable: { type: Boolean, default: true },
    giftMessageEnabled: { type: Boolean, default: true },
    personalizationFields: {
      customCakeMessage: { type: Boolean, default: false },
      giftMessage: { type: Boolean, default: false },
      imagePrint: { type: Boolean, default: false },
    },
    allowBackorder: { type: Boolean, default: false },
    isHamper: { type: Boolean, default: false },
    barcode: { type: String, trim: true },
    productGroup: { type: String, trim: true },
    skuVariant: { type: String, trim: true },
    standardSize: { type: String, trim: true },
    weight: { type: Number },
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
    },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    metaTitle: { type: String },
    metaDescription: { type: String },
    metaKeywords: [{ type: String, trim: true }],
    focusKeyword: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text', tags: 'text' });

productSchema.pre('save', function (next) {
  if (!this.slug && this.name) this.slug = generateSlug(this.name);
  if (!this.sku) this.sku = generateSKU();
  next();
});

const Product = mongoose.model('Product', productSchema);
export default Product;
