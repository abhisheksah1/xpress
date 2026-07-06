import mongoose from 'mongoose';
import { DEFAULT_API_PARTNER_ORDER_FIELDS } from '../config/apiPartnerDefaults.js';

const orderFieldSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    required: { type: Boolean, default: false },
  },
  { _id: false }
);

const apiPartnerSchema = new mongoose.Schema(
  {
    integrationName: { type: String, required: true, trim: true },
    companyName: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    apiUsername: { type: String, required: true, unique: true, trim: true, lowercase: true },
    apiKey: { type: String, required: true, unique: true },
    apiSecretHash: { type: String, required: true, select: false },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    allowAllProducts: { type: Boolean, default: false },
    allowedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    allowedDeliveryLocations: [{ type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryLocation' }],
    orderFields: { type: [orderFieldSchema], default: () => [...DEFAULT_API_PARTNER_ORDER_FIELDS] },
    ipWhitelist: [{ type: String, trim: true }],
    rateLimitPerMinute: { type: Number, default: 120, min: 10 },
    lastUsedAt: { type: Date },
    credentialsRotatedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

apiPartnerSchema.index({ status: 1, integrationName: 1 });

const ApiPartner = mongoose.model('ApiPartner', apiPartnerSchema);
export default ApiPartner;
