import mongoose from 'mongoose';

const treasuryTransactionSchema = new mongoose.Schema(
  {
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'TreasuryAccount', required: true },
    type: {
      type: String,
      enum: ['deposit', 'withdrawal', 'transfer_in', 'transfer_out', 'adjustment_in', 'adjustment_out'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true },
    reference: { type: String, trim: true },
    relatedModel: { type: String, enum: ['SupplierPurchase', 'OverheadExpense', 'Order', 'Manual', null], default: 'Manual' },
    relatedId: { type: mongoose.Schema.Types.ObjectId },
    balanceAfter: { type: Number, required: true },
    transactionDate: { type: Date, required: true, default: Date.now },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

treasuryTransactionSchema.index({ account: 1, transactionDate: -1 });

const TreasuryTransaction = mongoose.model('TreasuryTransaction', treasuryTransactionSchema);
export default TreasuryTransaction;
