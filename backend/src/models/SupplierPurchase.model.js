import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: { type: String, required: true, trim: true },
    sku: { type: String, trim: true },
    quantity: { type: Number, required: true, min: 1 },
    unitCost: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: true }
);

const supplierPurchaseSchema = new mongoose.Schema(
  {
    purchaseNumber: { type: String, required: true, unique: true, trim: true },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    purchaseDate: { type: Date, required: true, default: Date.now },
    items: { type: [purchaseItemSchema], default: [] },
    subtotal: { type: Number, required: true, min: 0, default: 0 },
    purchaseType: {
      type: String,
      enum: ['vat_13', 'non_vat', 'zero_rated', 'pan_bill', 'normal_bill'],
      default: 'vat_13',
    },
    vatRate: { type: Number, min: 0, max: 1, default: 0.13 },
    tax: { type: Number, min: 0, default: 0 },
    shipping: { type: Number, min: 0, default: 0 },
    total: { type: Number, required: true, min: 0, default: 0 },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'partial'], default: 'pending' },
    paidAmount: { type: Number, min: 0, default: 0 },
    treasuryAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'TreasuryAccount' },
    invoiceRef: { type: String, trim: true },
    notes: { type: String, trim: true },
    stockReceived: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

supplierPurchaseSchema.index({ purchaseDate: -1, vendor: 1 });

const SupplierPurchase = mongoose.model('SupplierPurchase', supplierPurchaseSchema);
export default SupplierPurchase;
