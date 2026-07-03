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
    announcement: {
      enabled: { type: Boolean, default: true },
      text: {
        type: String,
        default: 'Same-Day Flowers & Cake Delivery Available all major cities in Nepal — Order by 4:00 PM NST',
      },
      backgroundColor: { type: String, default: '#22c55e' },
      textColor: { type: String, default: '#ffffff' },
    },
    headerOptions: {
      showSearch: { type: Boolean, default: true },
      showCart: { type: Boolean, default: true },
      showCurrency: { type: Boolean, default: true },
      showLogin: { type: Boolean, default: true },
      showReminders: { type: Boolean, default: true },
      showLogo: { type: Boolean, default: true },
      searchPlaceholder: { type: String, default: 'Search gifts & flowers...' },
    },
    menuBar: {
      enabled: { type: Boolean, default: true },
      backgroundColor: { type: String, default: '#f3f4f6' },
    },
    footerOptions: {
      backgroundColor: { type: String, default: '#ffffff' },
      textColor: { type: String, default: '#4b5563' },
      headingColor: { type: String, default: '#111827' },
      borderColor: { type: String, default: '#e5e7eb' },
    },
    footerLayout: { type: mongoose.Schema.Types.Mixed },
    isActive: { type: Boolean, default: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const Navbar = mongoose.model('Navbar', navbarSchema);
export default Navbar;
