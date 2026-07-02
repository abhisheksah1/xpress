import mongoose from 'mongoose';
import { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS } from '../config/constants.js';
import { generateOrderNumber } from '../utils/helpers.js';
import Settings from './Settings.model.js';

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId },
    name: { type: String, required: true },
    sku: { type: String },
    image: { type: String },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    giftWrap: { type: Boolean, default: false },
    giftMessage: { type: String },
  },
  { _id: true }
);

const shippingAddressSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String },
    province: { type: String, required: true },
    district: { type: String, required: true },
    municipality: { type: String },
    ward: { type: String },
    street: { type: String, required: true },
    landmark: { type: String },
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema(
  {
    method: {
      type: String,
      enum: Object.values(PAYMENT_METHODS),
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
    },
    transactionId: { type: String },
    gatewayResponse: { type: mongoose.Schema.Types.Mixed },
    paidAt: { type: Date },
    amount: { type: Number },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    guestEmail: { type: String },
    guestPhone: { type: String },
    isGuest: { type: Boolean, default: false },
    items: [orderItemSchema],
    shippingAddress: shippingAddressSchema,
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
    },
    payment: paymentSchema,
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    deliveryZone: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryZone' },
    notes: { type: String },
    statusHistory: [
      {
        status: String,
        note: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    let prefix = 'KO-';
    try {
      const setting = await Settings.findOne({ key: 'registry_invoice_prefix' });
      if (setting?.value) prefix = String(setting.value);
    } catch {
      /* use default prefix */
    }
    this.orderNumber = generateOrderNumber(prefix);
  }
  next();
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
