import mongoose from 'mongoose';

const reminderSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, trim: true }, // e.g. "Mom's Birthday"
    occasionDate: { type: Date, required: true },
    recipientName: { type: String, trim: true },
    relation: { type: String, trim: true }, // e.g. Mother / Wife / Friend
    deliveryLocationText: { type: String, trim: true }, // free text as requested
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    lastSentAt: { type: Date },
    nextSendAt: { type: Date }, // optional (for scheduling later)
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // same as customer for now
  },
  { timestamps: true }
);

reminderSchema.index({ customer: 1, occasionDate: 1 });
reminderSchema.index({ occasionDate: 1, isActive: 1 });

const Reminder = mongoose.model('Reminder', reminderSchema);
export default Reminder;

