import mongoose from 'mongoose';
import { generateSlug } from '../utils/helpers.js';

const deliveryGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, lowercase: true },
    coverageLocations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryLocation' }],
    deliveryMethod: {
      type: String,
      enum: ['local_arrangement', 'courier_local', 'courier'],
      default: 'local_arrangement',
    },
    estimatedDeliveryLabel: { type: String, trim: true },
    estimatedDays: {
      min: { type: Number, default: 0, min: 0 },
      max: { type: Number, default: 1, min: 0 },
    },
    estimatedHours: { type: Number, min: 0 },
    cutoffTime: { type: String, default: '16:00' },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

deliveryGroupSchema.pre('save', function assignCode(next) {
  if (!this.code && this.name) {
    const slug = generateSlug(this.name).replace(/-/g, '_');
    this.code = `grp_${slug}`;
  }
  next();
});

const DeliveryGroup = mongoose.model('DeliveryGroup', deliveryGroupSchema);
export default DeliveryGroup;
