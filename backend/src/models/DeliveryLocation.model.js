import mongoose from 'mongoose';

const timeSlotSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    start: { type: String, trim: true },
    end: { type: String, trim: true },
    fee: { type: Number, default: 0, min: 0 },
    enabled: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { _id: false }
);

const deliveryLocationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    deliveryFee: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    timeSlotsEnabled: { type: Boolean, default: false },
    timeSlots: { type: [timeSlotSchema], default: [] },
  },
  { timestamps: true }
);

const DeliveryLocation = mongoose.model('DeliveryLocation', deliveryLocationSchema);
export default DeliveryLocation;
