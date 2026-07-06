import mongoose from 'mongoose';

const apiPartnerLogSchema = new mongoose.Schema(
  {
    partner: { type: mongoose.Schema.Types.ObjectId, ref: 'ApiPartner', index: true },
    method: { type: String, required: true },
    path: { type: String, required: true },
    statusCode: { type: Number },
    ip: { type: String },
    userAgent: { type: String },
    requestBody: { type: mongoose.Schema.Types.Mixed },
    responseSummary: { type: String },
    errorMessage: { type: String },
    durationMs: { type: Number },
  },
  { timestamps: true }
);

apiPartnerLogSchema.index({ createdAt: -1 });

const ApiPartnerLog = mongoose.model('ApiPartnerLog', apiPartnerLogSchema);
export default ApiPartnerLog;
