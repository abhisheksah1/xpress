import mongoose from 'mongoose';

const treasuryAccountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['cash', 'bank', 'mobile_wallet', 'other'],
      default: 'bank',
    },
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    openingBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    currency: { type: String, default: 'NPR', trim: true },
    isActive: { type: Boolean, default: true },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

treasuryAccountSchema.index({ isActive: 1, name: 1 });

const TreasuryAccount = mongoose.model('TreasuryAccount', treasuryAccountSchema);
export default TreasuryAccount;
