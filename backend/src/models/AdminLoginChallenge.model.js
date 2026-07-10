import mongoose from 'mongoose';

const adminLoginChallengeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    email: { type: String, required: true },
    otpHash: { type: String, required: true, select: false },
    fingerprintHash: { type: String, required: true },
    deviceLabel: { type: String, default: 'Unknown device' },
    userAgent: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    trustDevice: { type: Boolean, default: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

adminLoginChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AdminLoginChallenge = mongoose.model('AdminLoginChallenge', adminLoginChallengeSchema);
export default AdminLoginChallenge;
