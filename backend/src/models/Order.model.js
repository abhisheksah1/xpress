import mongoose from 'mongoose';
import { ORDER_STATUS, PAYMENT_STATUS, PAYMENT_METHODS } from '../config/constants.js';
import { generateOrderNumber } from '../utils/helpers.js';
import Settings from './Settings.model.js';

const orderItemPersonalizationSchema = new mongoose.Schema(
  {
    cakeMessage: { type: String },
    giftMessage: { type: String },
    printImageUrl: { type: String },
    printImageName: { type: String },
  },
  { _id: false, minimize: false }
);

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
    customerPrintImageUrl: { type: String },
    customerPrintImageName: { type: String },
    personalization: orderItemPersonalizationSchema,
  },
  { _id: true, minimize: false }
);

const contactSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String },
    phone: { type: String, required: true },
    countryCode: { type: String },
  },
  { _id: false }
);

const receiverSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    countryCode: { type: String, default: '+977' },
    address: { type: String, required: true },
  },
  { _id: false }
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

const serviceAddonSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    inputType: { type: String, enum: ['none', 'text', 'photo', 'both'], default: 'none' },
    customerText: { type: String },
    photoUrl: { type: String },
    photoName: { type: String },
  },
  { _id: false }
);

const timeSlotSchema = new mongoose.Schema(
  {
    id: { type: String },
    label: { type: String },
    start: { type: String },
    end: { type: String },
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
    sender: contactSchema,
    receiver: receiverSchema,
    items: [orderItemSchema],
    shippingAddress: shippingAddressSchema,
    serviceAddons: [serviceAddonSchema],
    addonsTotal: { type: Number, default: 0 },
    preferredDeliveryDate: { type: Date },
    timeSlot: timeSlotSchema,
    checkoutCurrency: { type: String, default: 'NPR' },
    checkoutCurrencyRate: { type: Number, default: 1 },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
    },
    payment: paymentSchema,
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    discountBreakdown: {
      subtotalDiscount: { type: Number, default: 0 },
      shippingDiscount: { type: Number, default: 0 },
    },
    coupon: {
      couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon' },
      code: { type: String, trim: true, uppercase: true },
      name: { type: String },
      discountType: { type: String },
      appliesTo: { type: String },
      redeemed: { type: Boolean, default: false },
    },
    tax: { type: Number, default: 0 },
    total: { type: Number, required: true },
    deliveryZone: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryGroup' },
    deliveryGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryGroup' },
    deliveryLocation: { type: mongoose.Schema.Types.ObjectId, ref: 'DeliveryLocation' },
    sameDayDelivery: { type: Boolean, default: false },
    estimatedDeliveryDays: {
      min: { type: Number },
      max: { type: Number },
    },
    deliveryWarnings: [{ type: String }],
    deliveryConstraintsMet: { type: Boolean, default: true },
    notes: { type: String },
    isLead: { type: Boolean, default: false },
    statusHistory: [
      {
        status: String,
        note: String,
        updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        updatedAt: { type: Date, default: Date.now },
      },
    ],
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    apiPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiPartner' },
    partnerExternalRef: { type: String, trim: true },
    orderSource: {
      type: String,
      enum: ['website', 'api_partner'],
      default: 'website',
    },
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
