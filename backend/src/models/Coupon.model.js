import mongoose from 'mongoose';

export const COUPON_DISCOUNT_TYPES = ['flat', 'percent', 'percent_capped'];
export const COUPON_APPLIES_TO = ['order', 'category', 'shipping', 'payment_gateway'];

const couponSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    discountType: {
      type: String,
      enum: COUPON_DISCOUNT_TYPES,
      required: true,
    },
    appliesTo: {
      type: String,
      enum: COUPON_APPLIES_TO,
      required: true,
    },
    value: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number, min: 0 },
    categoryIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    paymentGatewayIds: [{ type: String, trim: true }],
    minOrderAmount: { type: Number, min: 0, default: 0 },
    maxUses: { type: Number, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, min: 0 },
    startsAt: { type: Date },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

couponSchema.pre('validate', function (next) {
  if (this.code) this.code = String(this.code).trim().toUpperCase();
  if (this.discountType === 'percent_capped' && (this.maxDiscount == null || this.maxDiscount <= 0)) {
    return next(new Error('Max discount amount is required for percent + cap coupons'));
  }
  if (this.discountType === 'percent' && this.value > 100) {
    return next(new Error('Percent discount cannot exceed 100'));
  }
  if (this.appliesTo === 'category' && (!this.categoryIds || this.categoryIds.length === 0)) {
    return next(new Error('Select at least one category for category-wise coupons'));
  }
  if (this.appliesTo === 'payment_gateway' && (!this.paymentGatewayIds || this.paymentGatewayIds.length === 0)) {
    return next(new Error('Select at least one payment gateway'));
  }
  next();
});

const Coupon = mongoose.model('Coupon', couponSchema);
export default Coupon;
