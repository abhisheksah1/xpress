import mongoose from 'mongoose';

/**
 * Reusable product variable presets for admin
 * (e.g. Cake Size: 1 pound, 2 pound — Clothing Size: M, L, XL).
 * Stock is NOT stored here; it is set per product when the preset is applied.
 */
const optionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    priceAdjustment: { type: Number, default: 0 },
  },
  { _id: false }
);

const productVariableTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    tracksInventory: { type: Boolean, default: true },
    options: { type: [optionSchema], default: [] },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

productVariableTemplateSchema.index({ name: 1 }, { unique: true });
productVariableTemplateSchema.index({ isActive: 1, sortOrder: 1, name: 1 });

const ProductVariableTemplate = mongoose.model(
  'ProductVariableTemplate',
  productVariableTemplateSchema
);

export default ProductVariableTemplate;
