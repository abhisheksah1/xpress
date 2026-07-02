import mongoose from 'mongoose';
import dotenv from 'dotenv';
import config from '../config/index.js';
import { User, Navbar, DeliveryLocation, DeliveryGroup, CMSPage } from '../models/index.js';
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
  await seedNavbar();
  await seedFooterNavbar();
  await seedHomePage();
  await seedStaticPages();
  await seedDelivery();
}
