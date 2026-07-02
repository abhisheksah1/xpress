import mongoose from 'mongoose';

export const deliveryGroupRuleSchema = new mongoose.Schema(
  {
    group: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryGroup', required: true },
    available: { type: Boolean, default: true },
    sameDay: { type: Boolean, default: false },
    estimatedDays: {
      min: { type: Number, min: 0 },
      max: { type: Number, min: 0 },
    },
  },
  { _id: false }
);
