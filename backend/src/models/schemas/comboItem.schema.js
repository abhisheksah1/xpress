import mongoose from 'mongoose';

const comboItemSelectedOptionSchema = new mongoose.Schema(
  {
    category: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    priceAdjustment: { type: Number, default: 0 },
  },
  { _id: false }
);

export const comboItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1, min: 1 },
    sortOrder: { type: Number, default: 0 },
    /** Admin-fixed variation(s) for variable components (Size, Weight, etc.). */
    selectedOptions: { type: [comboItemSelectedOptionSchema], default: undefined },
  },
  { _id: true }
);
