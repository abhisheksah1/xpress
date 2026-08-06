import mongoose from 'mongoose';

/** One document per calendar day (Asia/Kathmandu) with page-view + unique visitor counts. */
const visitStatSchema = new mongoose.Schema(
  {
    date: { type: String, required: true, unique: true, index: true }, // YYYY-MM-DD
    pageViews: { type: Number, default: 0, min: 0 },
    uniqueVisitors: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

/** Tracks a visitor once per day for unique counting. */
const visitVisitorDaySchema = new mongoose.Schema(
  {
    date: { type: String, required: true, index: true },
    visitorId: { type: String, required: true, maxlength: 64 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

visitVisitorDaySchema.index({ date: 1, visitorId: 1 }, { unique: true });

export const VisitStat = mongoose.model('VisitStat', visitStatSchema);
export const VisitVisitorDay = mongoose.model('VisitVisitorDay', visitVisitorDaySchema);
