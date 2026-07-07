import mongoose from 'mongoose';

const overheadExpenseSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['rent', 'utilities', 'salaries', 'marketing', 'logistics', 'maintenance', 'other'],
      default: 'other',
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    amount: { type: Number, required: true, min: 0 },
    expenseDate: { type: Date, required: true, default: Date.now },
    paymentStatus: { type: String, enum: ['pending', 'paid'], default: 'paid' },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    treasuryAccount: { type: mongoose.Schema.Types.ObjectId, ref: 'TreasuryAccount' },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

overheadExpenseSchema.index({ expenseDate: -1, category: 1 });

const OverheadExpense = mongoose.model('OverheadExpense', overheadExpenseSchema);
export default OverheadExpense;
