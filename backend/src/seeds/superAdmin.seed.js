import mongoose from 'mongoose';
import dotenv from 'dotenv';
import config from '../config/index.js';
import { User, Navbar, DeliveryZone } from '../models/index.js';
import { ROLES } from '../config/constants.js';
import { seedDefaultSettings } from '../services/settings.service.js';

dotenv.config();

const seedSuperAdmin = async () => {
  const existing = await User.findOne({ role: ROLES.SUPER_ADMIN });
  if (existing) {
    console.log('Super admin already exists');
    return;
  }

  await User.create({
    name: config.superAdmin.name,
    email: config.superAdmin.email,
    password: config.superAdmin.password,
    phone: config.superAdmin.phone,
    role: ROLES.SUPER_ADMIN,
    isEmailVerified: true,
    isActive: true,
  });

  console.log(`Super admin created: ${config.superAdmin.email}`);
};

const seedNavbar = async () => {
  const existing = await Navbar.findOne({ location: 'header' });
  if (existing) return;

  await Navbar.create({
    name: 'Main Header',
    location: 'header',
    items: [
      { label: 'Home', link: '/', sortOrder: 0 },
      { label: 'Shop', link: '/shop', sortOrder: 1 },
      { label: 'Gifts', link: '/gifts', sortOrder: 2 },
      { label: 'Blog', link: '/blog', sortOrder: 3 },
      { label: 'About', link: '/about', sortOrder: 4 },
      { label: 'Contact', link: '/contact', sortOrder: 5 },
    ],
  });
};

const seedDeliveryZones = async () => {
  const count = await DeliveryZone.countDocuments();
  if (count > 0) return;

  const zones = [
    { name: 'Kathmandu Valley', province: 'Bagmati Pradesh', districts: ['Kathmandu', 'Lalitpur', 'Bhaktapur'], deliveryFee: 100, estimatedDays: { min: 1, max: 2 } },
    { name: 'Pokhara', province: 'Gandaki Pradesh', districts: ['Kaski'], deliveryFee: 200, estimatedDays: { min: 2, max: 4 } },
    { name: 'Biratnagar', province: 'Province 1', districts: ['Morang'], deliveryFee: 250, estimatedDays: { min: 3, max: 5 } },
    { name: 'Rest of Nepal', province: 'All', districts: [], deliveryFee: 350, estimatedDays: { min: 3, max: 7 } },
  ];

  await DeliveryZone.insertMany(zones);
  console.log('Default delivery zones seeded');
};

const runSeed = async () => {
  try {
    await mongoose.connect(config.db.uri);
    await seedSuperAdmin();
    await seedDefaultSettings();
    await seedNavbar();
    await seedDeliveryZones();
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
  await seedNavbar();
  await seedDeliveryZones();
}
