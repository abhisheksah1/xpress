import mongoose from 'mongoose';

const adminTrustedDeviceSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fingerprintHash: { type: String, required: true, index: true },
    deviceLabel: { type: String, default: 'Unknown device' },
    userAgent: { type: String, default: '' },
    ipAddress: { type: String, default: '' },
    lastUsedAt: { type: Date, default: Date.now },
    /** Only devices verified via email OTP may skip OTP on later logins. */
    verifiedViaOtp: { type: Boolean, default: false },
  },
  { timestamps: true }
);

adminTrustedDeviceSchema.index({ user: 1, fingerprintHash: 1 }, { unique: true });

const AdminTrustedDevice = mongoose.model('AdminTrustedDevice', adminTrustedDeviceSchema);
export default AdminTrustedDevice;
