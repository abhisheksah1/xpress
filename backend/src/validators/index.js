import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    phone: z.string().min(10).max(15).optional(),
    password: z.string().min(8).max(128),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

export const createProductSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    description: z.string().optional(),
    shortDescription: z.string().optional(),
    category: z.string(),
    price: z.number().min(0),
    compareAtPrice: z.number().min(0).optional(),
    costPrice: z.number().min(0).optional(),
    stock: z.number().min(0).optional(),
    tags: z.array(z.string()).optional(),
    isGiftWrappable: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const createOrderSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string(),
          variantId: z.string().optional(),
          quantity: z.number().min(1),
          giftWrap: z.boolean().optional(),
          giftMessage: z.string().optional(),
        })
      )
      .min(1),
    shippingAddress: z.object({
      fullName: z.string().min(2),
      phone: z.string().min(10),
      email: z.string().email().optional(),
      province: z.string(),
      district: z.string(),
      municipality: z.string().optional(),
      ward: z.string().optional(),
      street: z.string(),
      landmark: z.string().optional(),
    }),
    deliveryZoneId: z.string().optional(),
    paymentMethod: z.enum(['khalti', 'esewa', 'fonepay', 'card', 'cod']),
    notes: z.string().optional(),
    guestEmail: z.string().email().optional(),
    guestPhone: z.string().optional(),
  }),
});

export const bulkPriceSchema = z.object({
  body: z.object({
    productIds: z.array(z.string()).min(1),
    type: z.enum(['percentage', 'fixed', 'set']),
    value: z.number(),
  }),
});

export const createStaffSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    email: z.string().email(),
    phone: z.string().optional(),
    password: z.string().min(8),
    role: z.enum(['admin', 'staff']).optional(),
    permissions: z.array(z.string()).optional(),
  }),
});

export const createBlogSchema = z.object({
  body: z.object({
    title: z.string().min(3),
    content: z.string().min(10),
    excerpt: z.string().optional(),
    tags: z.array(z.string()).optional(),
    isPublished: z.boolean().optional(),
  }),
});

export const updateSettingsSchema = z.object({
  body: z.object({
    settings: z.array(z.object({ key: z.string(), value: z.any() })).min(1),
  }),
});

export const uploadImageSchema = z.object({
  body: z.object({
    url: z.string().url().optional(),
    alt: z.string().optional(),
  }),
});
