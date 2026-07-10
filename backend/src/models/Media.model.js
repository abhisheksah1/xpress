import mongoose from 'mongoose';

const mediaSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true },
    alt: { type: String, default: '', trim: true },
    filename: { type: String, default: '', trim: true },
    format: { type: String, default: '' },
    width: { type: Number },
    height: { type: Number },
    sizeBytes: { type: Number },
    tags: [{ type: String, trim: true, lowercase: true }],
    category: { type: String, default: '', trim: true, lowercase: true },
    sourceContext: { type: String, default: '', trim: true },
    sourceLabel: { type: String, default: '', trim: true },
    searchText: { type: String, default: '', trim: true, lowercase: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

mediaSchema.index({ url: 1 });
mediaSchema.index({ publicId: 1 }, { sparse: true });
mediaSchema.index({ tags: 1 });
mediaSchema.index({ category: 1 });
mediaSchema.index({ searchText: 'text', alt: 'text', filename: 'text', sourceLabel: 'text' });
mediaSchema.index({ createdAt: -1 });

const buildSearchText = (doc) =>
  [
    doc.filename,
    doc.alt,
    doc.category,
    doc.sourceContext,
    doc.sourceLabel,
    ...(doc.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

mediaSchema.pre('save', function syncSearchText(next) {
  this.searchText = buildSearchText(this);
  next();
});

const Media = mongoose.model('Media', mediaSchema);
export default Media;
