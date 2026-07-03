import { CMS_PAGE_TYPES } from './constants.js';

export const DEFAULT_HOME_PAGE = {
  title: 'Homepage',
  slug: 'home',
  pageType: CMS_PAGE_TYPES.HOME,
  isPublished: true,
  metaTitle: 'KoseliXpress — Gifts & Flowers in Nepal',
  metaDescription: 'Send gifts, flowers, and cakes across Nepal with same-day delivery in Kathmandu Valley.',
  blocks: [
    {
      type: 'hero',
      title: 'Send Love Across Nepal',
      content: 'Premium gifts, flowers, and cakes delivered to your loved ones.',
      buttonText: 'Shop Now',
      buttonLink: '/shop',
      sortOrder: 0,
      isActive: true,
    },
    {
      type: 'delivery_countdown',
      title: 'Need delivery today in Kathmandu Valley?',
      buttonText: 'Order Now',
      buttonLink: '/shop',
      sortOrder: 1,
      isActive: true,
      settings: {
        cutoffTime: '17:00',
        timezone: 'Asia/Kathmandu',
        titleSameDay: 'Need delivery today in Kathmandu Valley?',
        titleNextDay: 'Next-day delivery — order now for tomorrow',
        headingBefore: 'Order closing in...',
        headingAfter: 'Same-day delivery opens in...',
      },
    },
    {
      type: 'categories_grid',
      title: 'Browse Store Occasions',
      sortOrder: 2,
      isActive: true,
      settings: { sortBy: 'custom', limit: 20, hideEmpty: true, categoryIds: [], cols: 4 },
    },
    {
      type: 'product_grid',
      title: 'Featured Gifts',
      content: 'Handpicked favorites for every occasion.',
      buttonText: 'View all',
      buttonLink: '/shop',
      sortOrder: 3,
      isActive: true,
      settings: { limit: 8, isFeatured: true },
    },
  ],
};
