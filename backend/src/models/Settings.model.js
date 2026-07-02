import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    group: {
      type: String,
      enum: [
        'general', 'store', 'payment', 'shipping', 'email', 'seo', 'social', 'appearance',
        'currency', 'addons', 'plugins', 'branding', 'compliance', 'timeslots', 'auth', 'registry',
      ],
      default: 'general',
    },
    label: { type: String },
    description: { type: String },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const Settings = mongoose.model('Settings', settingsSchema);
export default Settings;
