import mongoose from 'mongoose';

export const comboItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, default: 1, min: 1 },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: true }
);
