import mongoose from 'mongoose';
import dotenv from 'dotenv';
import config from '../config/index.js';
import { User, Navbar, DeliveryLocation, DeliveryGroup, CMSPage } from '../models/index.js';
import { ROLES, CMS_PAGE_TYPES } from '../config/constants.js';
import { DEFAULT_HOME_PAGE } from '../config/defaultHomePage.js';
import { DEFAULT_FOOTER_LAYOUT, DEFAULT_FOOTER_OPTIONS, resolveFooterOptions } from '../config/defaultFooterContent.js';
import { DEFAULT_BRAND_LOGO } from '../config/brandLogo.js';
import { seedDefaultSettings } from '../services/settings.service.js';
import { syncPaymentGatewaysFromEnv } from '../services/paymentGateway.service.js';

dotenv.config();

const seedSuperAdmin = async () => {
  if (process.env.NODE_ENV === 'production' && config.superAdmin.password === 'ChangeMe@123') {
    throw new Error('Set SUPER_ADMIN_PASSWORD in production before seeding — default password is not allowed.');
  }

  const { name, email, password, phone } = config.superAdmin;
  const envEmail = String(email || '').trim().toLowerCase();

  let target = envEmail
    ? await User.findOne({ email: envEmail }).select('+password')
    : null;

  const existingSuperAdmin = await User.findOne({ role: ROLES.SUPER_ADMIN }).select('+password');

  if (!target && existingSuperAdmin) {
    target = existingSuperAdmin;
  }

  if (target) {
    let changed = false;

    if (name && target.name !== name) {
      target.name = name;
      changed = true;
    }
    if (envEmail && target.email !== envEmail) {
      target.email = envEmail;
      changed = true;
    }
    if (phone && target.phone !== phone) {
      target.phone = phone;
      changed = true;
    }
    if (target.role !== ROLES.SUPER_ADMIN) {
      target.role = ROLES.SUPER_ADMIN;
      changed = true;
    }
    if (!target.isEmailVerified) {
      target.isEmailVerified = true;
      changed = true;
    }
    if (!target.isActive) {
      target.isActive = true;
      changed = true;
    }

    if (password) {
      const passwordMatches = await target.comparePassword(password);
      if (!passwordMatches) {
        target.password = password;
        changed = true;
      }
    }

    if (changed) {
      await target.save();
      console.log(`Super admin synced from env: ${target.email}`);
    } else {
      console.log('Super admin already exists');
    }

    // Keep a single super admin: demote any other account still marked super_admin
    if (existingSuperAdmin && String(existingSuperAdmin._id) !== String(target._id)) {
      existingSuperAdmin.role = ROLES.ADMIN;
      await existingSuperAdmin.save();
      console.log(`Previous super admin demoted to admin: ${existingSuperAdmin.email}`);
    }
    return;
  }

  await User.create({
    name,
    email: envEmail,
    password,
    phone,
    role: ROLES.SUPER_ADMIN,
    isEmailVerified: true,
    isActive: true,
  });

  console.log(`Super admin created: ${envEmail}`);
};

const seedNavbar = async () => {
  const existing = await Navbar.findOne({ location: 'header' });
  if (existing) {
    if (!existing.logo?.url) {
      existing.logo = DEFAULT_BRAND_LOGO;
      await existing.save();
      console.log('Header logo backfilled on existing navbar');
    }
    return;
  }

  await Navbar.create({
    name: 'Main Header',
    location: 'header',
    logo: DEFAULT_BRAND_LOGO,
    announcement: {
      enabled: true,
      text: 'Same-Day Flowers & Cake Delivery Available all major cities in Nepal — Order by 4:00 PM NST',
      backgroundColor: '#22c55e',
      textColor: '#ffffff',
    },
    headerOptions: {
      showSearch: true,
      showCart: true,
      showCurrency: true,
      showLogin: true,
      showReminders: true,
      showLogo: true,
      searchPlaceholder: 'Search gifts & flowers...',
    },
    menuBar: {
      enabled: true,
      backgroundColor: '#f3f4f6',
    },
    items: [
      { label: 'Shrawan Gifts', link: '/shop', type: 'dropdown', children: [], sortOrder: 0, isActive: true },
      { label: 'Gift By Recipient', link: '/shop', type: 'dropdown', children: [], sortOrder: 1, isActive: true },
      { label: 'Birthday Gifts', link: '/shop?search=birthday', type: 'link', sortOrder: 2, isActive: true },
      { label: 'Cake Delivery', link: '/shop?search=cake', type: 'link', sortOrder: 3, isActive: true },
      { label: 'Occasion Gifts', link: '/shop', type: 'dropdown', children: [], sortOrder: 4, isActive: true },
      { label: 'Combos', link: '/shop?search=combo', type: 'link', sortOrder: 5, isActive: true },
      { label: 'Flowers & Fruits', link: '/shop?search=flowers', type: 'link', sortOrder: 6, isActive: true },
      { label: 'SPECIAL GIFTS', link: '/shop?search=special', type: 'link', sortOrder: 7, isActive: true },
    ],
  });
};

const seedFooterNavbar = async () => {
  const existing = await Navbar.findOne({ location: 'footer' });
  if (existing) {
    let changed = false;
    if (!existing.footerLayout?.linkColumns?.length) {
      existing.footerLayout = DEFAULT_FOOTER_LAYOUT;
      changed = true;
    }
    const nextFooterOptions = resolveFooterOptions(existing.footerOptions || {});
    if (JSON.stringify(existing.footerOptions || {}) !== JSON.stringify(nextFooterOptions)) {
      existing.footerOptions = nextFooterOptions;
      changed = true;
    }
    if (!existing.logo?.url) {
      existing.logo = DEFAULT_BRAND_LOGO;
      changed = true;
    }
    if (changed) {
      await existing.save();
      console.log('Footer layout/logo backfilled on existing navbar');
    }
    return;
  }

  await Navbar.create({
    name: 'Footer Links',
    location: 'footer',
    logo: DEFAULT_BRAND_LOGO,
    footerOptions: DEFAULT_FOOTER_OPTIONS,
    footerLayout: DEFAULT_FOOTER_LAYOUT,
    items: [],
  });
};

const seedHomePage = async () => {
  const existing = await CMSPage.findOne({ pageType: CMS_PAGE_TYPES.HOME });
  if (existing) return;

  await CMSPage.create(DEFAULT_HOME_PAGE);
  console.log('Default homepage seeded');
};

const seedStaticPages = async () => {
  // CMS pages are created by admin — no prebuilt static pages.
};

const seedDelivery = async () => {
  const locCount = await DeliveryLocation.countDocuments();
  if (locCount > 0) return;

  const locationRows = [
    { name: 'Kathmandu Valley', deliveryFee: 100, sortOrder: 1 },
    { name: 'Pokhara (Lakeside & Bazar)', deliveryFee: 200, sortOrder: 2 },
    { name: 'Biratnagar', deliveryFee: 250, sortOrder: 3 },
    { name: 'Bharatpur', deliveryFee: 250, sortOrder: 4 },
    { name: 'Bhairahawa', deliveryFee: 275, sortOrder: 5 },
    { name: 'Nepalgunj', deliveryFee: 300, sortOrder: 6 },
    { name: 'Dharan', deliveryFee: 300, sortOrder: 7 },
    { name: 'Butwal', deliveryFee: 300, sortOrder: 8 },
    { name: 'Hetauda', deliveryFee: 275, sortOrder: 9 },
    { name: 'Dhangadhi', deliveryFee: 300, sortOrder: 10 },
    { name: 'Outside the valley area', deliveryFee: 450, sortOrder: 11 },
    { name: 'Other Districts and cities', deliveryFee: 500, sortOrder: 12 },
  ];

  const locations = await DeliveryLocation.insertMany(locationRows);
  const byName = Object.fromEntries(locations.map((l) => [l.name, l._id]));

  const groups = [
    {
      name: 'Kathmandu Valley',
      code: 'grp_ktm',
      coverageLocations: [
        byName['Kathmandu Valley'],
      ],
      deliveryMethod: 'local_arrangement',
      estimatedDeliveryLabel: 'Minimum 4 Hours',
      estimatedHours: 4,
      estimatedDays: { min: 0, max: 1 },
      cutoffTime: '16:00',
      sortOrder: 1,
    },
    {
      name: 'Major Cities',
      code: 'grp_major',
      coverageLocations: [
        byName['Pokhara (Lakeside & Bazar)'],
        byName.Bharatpur,
        byName.Biratnagar,
        byName.Butwal,
        byName.Nepalgunj,
        byName.Dharan,
        byName.Hetauda,
        byName.Dhangadhi,
        byName.Bhairahawa,
      ].filter(Boolean),
      deliveryMethod: 'local_arrangement',
      estimatedDeliveryLabel: 'Next Day Delivery',
      estimatedDays: { min: 1, max: 1 },
      cutoffTime: '16:00',
      sortOrder: 2,
    },
    {
      name: 'Tarai Area',
      code: 'grp_tarai',
      coverageLocations: [byName['Outside the valley area'], byName['Other Districts and cities']].filter(Boolean),
      deliveryMethod: 'courier_local',
      estimatedDeliveryLabel: '1-2 Days',
      estimatedDays: { min: 1, max: 2 },
      cutoffTime: '16:00',
      sortOrder: 3,
    },
  ];

  await DeliveryGroup.insertMany(groups);
  console.log('Default delivery locations and groups seeded');
};

const runSeed = async () => {
  try {
    await mongoose.connect(config.db.uri);
    await seedSuperAdmin();
    await seedDefaultSettings();
    await syncPaymentGatewaysFromEnv();
    await seedNavbar();
    await seedFooterNavbar();
    await seedHomePage();
    await seedStaticPages();
    await seedDelivery();
    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
};

if (process.argv[1]?.includes('superAdmin.seed')) {
  runSeed();
}

export default async function seedOnStartup() {
  await seedSuperAdmin();
  await seedDefaultSettings();
  await syncPaymentGatewaysFromEnv();
  await seedNavbar();
  await seedFooterNavbar();
  await seedHomePage();
  await seedStaticPages();
  await seedDelivery();
}
