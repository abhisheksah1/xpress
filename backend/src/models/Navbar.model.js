import mongoose from 'mongoose';

const navItemSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    link: { type: String, required: true },
    type: {
      type: String,
      enum: ['link', 'dropdown', 'mega'],
      default: 'link',
    },
    children: [{ type: mongoose.Schema.Types.Mixed }],
    icon: { type: String },
    openInNewTab: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const navbarSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, default: 'Main Navbar' },
    location: {
      type: String,
      enum: ['header', 'footer', 'mobile'],
      default: 'header',
    },
    items: [navItemSchema],
    logo: {
      url: { type: String },
      publicId: { type: String },
      alt: { type: String },
    },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const Navbar = mongoose.model('Navbar', navbarSchema);
export default Navbar;
