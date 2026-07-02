import mongoose from 'mongoose';

const deliveryZoneSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    province: { type: String, required: true },
    districts: [{ type: String }],
    deliveryFee: { type: Number, required: true, min: 0 },
    estimatedDays: {
      min: { type: Number, default: 1 },
      max: { type: Number, default: 5 },
    },
    isActive: { type: Boolean, default: true },
    freeShippingThreshold: { type: Number, default: 0 },
    codAvailable: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const DeliveryZone = mongoose.model('DeliveryZone', deliveryZoneSchema);
export default DeliveryZone;
