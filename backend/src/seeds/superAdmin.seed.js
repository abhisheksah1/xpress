import mongoose from 'mongoose';
import dotenv from 'dotenv';
import config from '../config/index.js';
import { User, Navbar, DeliveryZone, CMSPage } from '../models/index.js';
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

const seedFooterNavbar = async () => {
  const existing = await Navbar.findOne({ location: 'footer' });
  if (existing) return;

  await Navbar.create({
    name: 'Footer Links',
    location: 'footer',
    items: [
      { label: 'About Us', link: '/about', sortOrder: 0 },
      { label: 'Contact', link: '/contact', sortOrder: 1 },
      { label: 'FAQ', link: '/p/faq', sortOrder: 2 },
      { label: 'Blog', link: '/blog', sortOrder: 3 },
      { label: 'Shop', link: '/shop', sortOrder: 4 },
    ],
  });
};

const seedHomePage = async () => {
  const existing = await CMSPage.findOne({ pageType: 'home' });
  if (existing) return;

  await CMSPage.create({
    title: 'Home',
    slug: 'home',
    pageType: 'home',
    isPublished: true,
    metaTitle: 'KoseliXpress - Gift Portal Nepal',
    metaDescription: 'Send gifts across Nepal with same-day delivery in major cities.',
    blocks: [
      {
        type: 'hero',
        title: 'Send Love Across Nepal',
        content: 'Curated gifts delivered to every corner of Nepal. Perfect for birthdays, festivals, and special moments.',
        buttonText: 'Shop Gifts',
        buttonLink: '/shop',
        sortOrder: 0,
        isActive: true,
      },
      {
        type: 'text',
        title: 'Why KoseliXpress?',
        sortOrder: 1,
        isActive: true,
        settings: {
          layout: 'features',
          features: [
            { title: 'Nationwide Delivery', desc: 'We deliver gifts across all 7 provinces of Nepal.' },
            { title: 'Gift Wrapping', desc: 'Beautiful gift wrapping with personalized messages.' },
            { title: 'Secure Payments', desc: 'Pay via Khalti, eSewa, Fonepay, or card.' },
          ],
        },
      },
      {
        type: 'cta',
        title: 'Same-Day Delivery Available',
        content: 'Order before 2 PM in Kathmandu Valley for same-day gift delivery.',
        buttonText: 'Browse Collections',
        buttonLink: '/shop',
        sortOrder: 2,
        isActive: true,
      },
    ],
  });
  console.log('Home CMS page seeded');
};

const seedStaticPages = async () => {
  const pages = [
    {
      title: 'About Us',
      slug: 'about',
      pageType: 'about',
      blocks: [
        {
          type: 'text',
          title: 'About KoseliXpress',
          content: 'KoseliXpress is Nepal\'s trusted online gift portal. We help you send love across cities with curated gifts, cakes, flowers, and hampers — delivered with care.',
          sortOrder: 0,
          isActive: true,
        },
      ],
    },
    {
      title: 'Contact Us',
      slug: 'contact',
      pageType: 'contact',
      blocks: [
        {
          type: 'text',
          title: 'Get in Touch',
          content: 'Email: info@koselixpress.com\nPhone: 9800000000\nAddress: Kathmandu, Nepal',
          sortOrder: 0,
          isActive: true,
        },
      ],
    },
    {
      title: 'FAQ',
      slug: 'faq',
      pageType: 'faq',
      blocks: [
        {
          type: 'faq',
          title: 'Frequently Asked Questions',
          sortOrder: 0,
          isActive: true,
          settings: {
            items: [
              { q: 'Do you deliver nationwide?', a: 'Yes, we deliver across all provinces in Nepal.' },
              { q: 'Can I add a gift message?', a: 'Yes, you can add a personalized message at checkout.' },
              { q: 'What payment methods do you accept?', a: 'Khalti, eSewa, Fonepay, card, and cash on delivery.' },
            ],
          },
        },
      ],
    },
  ];

  for (const page of pages) {
    const exists = await CMSPage.findOne({ slug: page.slug });
    if (!exists) {
      await CMSPage.create({ ...page, isPublished: true });
    }
  }
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
    await seedFooterNavbar();
    await seedHomePage();
    await seedStaticPages();
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
  await seedFooterNavbar();
  await seedHomePage();
  await seedStaticPages();
  await seedDeliveryZones();
}
