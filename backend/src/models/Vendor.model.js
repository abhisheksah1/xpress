import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    companyName: { type: String, trim: true },
    contactPerson: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    address: { type: String, trim: true },
    paymentTerms: { type: String, trim: true },
    billType: { type: String, enum: ['pan', 'vat', 'normal'], default: 'pan' },
    panNumber: { type: String, trim: true },
    vatNumber: { type: String, trim: true },
    notes: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

vendorSchema.index({ name: 1, status: 1 });

const Vendor = mongoose.model('Vendor', vendorSchema);
export default Vendor;
