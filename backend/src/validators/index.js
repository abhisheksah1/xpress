import { z } from 'zod';
import { seoMetaZod } from '../utils/seoMeta.js';

const toOptionalNumber = (val) => {
  if (val === '' || val == null) return undefined;
  const n = Number(val);
  return Number.isFinite(n) ? n : undefined;
};

const toRequiredNumber = (val) => {
  if (val === '' || val == null) return val;
  const n = Number(val);
  return Number.isFinite(n) ? n : val;
};

const toProductId = (val) => (val && typeof val === 'object' && val._id != null ? String(val._id) : val);

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(100),
    email: z.string().email(),
    countryCode: z.string().regex(/^\+\d{1,4}$/).default('+977'),
    phone: z.string().min(6).max(15),
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
    slug: z.string().optional(),
    sku: z.string().optional(),
    description: z.string().optional(),
    shortDescription: z.string().optional(),
    shortDescriptionEnabled: z.boolean().optional(),
    longDescription: z.string().optional(),
    additionalNote: z.string().optional(),
    category: z.string(),
    categories: z.array(z.string()).optional(),
    brand: z.string().optional(),
    price: z.preprocess(toRequiredNumber, z.number().min(0)),
    compareAtPrice: z.preprocess(toOptionalNumber, z.number().min(0).optional()),
    costPrice: z.preprocess(toOptionalNumber, z.number().min(0).optional()),
    stock: z.preprocess(toOptionalNumber, z.number().min(0).optional()),
    lowStockThreshold: z.preprocess(toOptionalNumber, z.number().min(0).optional()),
    tags: z.array(z.string()).optional(),
    images: z.array(z.object({
      url: z.string(),
      publicId: z.string().optional(),
      alt: z.string().optional(),
      isPrimary: z.boolean().optional(),
      sortOrder: z.number().optional(),
    })).optional(),
    deliveryZones: z.array(z.string()).optional(),
    deliveryScope: z.enum(['inherit', 'all', 'selected']).optional(),
    deliveryGroupRules: z.array(z.object({
      group: z.string(),
      available: z.boolean().optional(),
      sameDay: z.boolean().optional(),
      estimatedDays: z.object({
        min: z.number().min(0).optional(),
        max: z.number().min(0).optional(),
      }).optional(),
    })).optional(),
    optionCategories: z.array(z.object({
      name: z.string(),
      options: z.array(z.object({
        label: z.string(),
        priceAdjustment: z.number().optional(),
      })),
    })).optional(),
    personalizationFields: z.object({
      customCakeMessage: z.union([
        z.boolean(),
        z.object({ enabled: z.boolean().optional(), required: z.boolean().optional() }),
      ]).optional(),
      giftMessage: z.union([
        z.boolean(),
        z.object({ enabled: z.boolean().optional(), required: z.boolean().optional() }),
      ]).optional(),
      imagePrint: z.union([
        z.boolean(),
        z.object({ enabled: z.boolean().optional(), required: z.boolean().optional() }),
      ]).optional(),
    }).optional(),
    allowBackorder: z.boolean().optional(),
    isHamper: z.boolean().optional(),
    comboItems: z.array(z.object({
      product: z.preprocess(toProductId, z.string()),
      quantity: z.number().min(1).optional(),
      sortOrder: z.number().optional(),
    })).optional(),
    barcode: z.string().optional(),
    productGroup: z.string().optional(),
    skuVariant: z.string().optional(),
    standardSize: z.string().optional(),
    weight: z.number().optional(),
    isGiftWrappable: z.boolean().optional(),
    giftMessageEnabled: z.boolean().optional(),
    isFeatured: z.boolean().optional(),
    isActive: z.boolean().optional(),
    metaTitle: z.string().optional(),
    metaDescription: z.string().optional(),
    metaKeywords: z.array(z.string()).optional(),
    focusKeyword: z.string().optional(),
  }),
});

const shippingAddressBodySchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  province: z.string(),
  district: z.string(),
  municipality: z.string().optional(),
  ward: z.string().optional(),
  street: z.string(),
  landmark: z.string().optional(),
});

const senderBodySchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(5),
  countryCode: z.string().min(2),
});

const receiverBodySchema = z.object({
  fullName: z.string().min(2),
  countryCode: z.string().min(2),
  phone: z.string().min(6),
  address: z.string().min(3),
}).superRefine((data, ctx) => {
  const digits = data.phone.replace(/\D/g, '');
  if (data.countryCode === '+977' && !/^\d{10}$/.test(digits)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Receiver contact must be exactly 10 digits for Nepal',
      path: ['phone'],
    });
  } else if (data.countryCode !== '+977' && !/^\d{6,15}$/.test(digits)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Enter a valid receiver contact number',
      path: ['phone'],
    });
  }
});

export const createOrderSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string(),
          variantId: z.string().optional(),
          quantity: z.number().min(1),
          unitPrice: z.number().min(0).optional(),
          giftWrap: z.boolean().optional(),
          giftMessage: z.string().optional(),
          personalization: z.object({
            cakeMessage: z.string().optional(),
            giftMessage: z.string().optional(),
            printImageUrl: z.string().optional(),
            printImageName: z.string().optional(),
          }).optional(),
        })
      )
      .min(1),
    sender: senderBodySchema.optional(),
    receiver: receiverBodySchema.optional(),
    shippingAddress: shippingAddressBodySchema.optional(),
    deliveryZoneId: z.string().optional(),
    deliveryLocationId: z.string().optional(),
    deliveryGroupId: z.string().optional(),
    deliveryLocation: z.string().optional(),
    sameDayDelivery: z.boolean().optional(),
    paymentMethod: z.enum(['khalti', 'esewa', 'imepay', 'fonepay', 'card', 'hbl', 'manual_bank', 'cod']),
    couponCode: z.string().min(2).max(40).optional(),
    notes: z.string().optional(),
    guestEmail: z.string().email().optional(),
    guestPhone: z.string().optional(),
    serviceAddonIds: z.array(z.string()).optional(),
    serviceAddons: z.array(z.object({
      id: z.string(),
      text: z.string().optional(),
      photoUrl: z.string().optional(),
      photoName: z.string().optional(),
    })).optional(),
    preferredDeliveryDate: z.union([z.string(), z.date()]).optional(),
    timeSlotId: z.string().optional(),
    checkoutCurrency: z.string().min(3).max(3).optional(),
  }).superRefine((body, ctx) => {
    const hasLegacy = !!body.shippingAddress;
    const hasNew = !!body.sender && !!body.receiver;
    if (!hasLegacy && !hasNew) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Sender and receiver details are required',
        path: ['sender'],
      });
    }
    if (!body.deliveryLocationId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Delivery location is required',
        path: ['deliveryLocationId'],
      });
    }
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
    category: z.string().optional(),
    isPublished: z.boolean().optional(),
    featuredImage: z.object({
      url: z.string().optional(),
      publicId: z.string().optional(),
      alt: z.string().optional(),
    }).optional(),
    metaTitle: z.string().max(160).optional(),
    metaDescription: z.string().max(320).optional(),
    seo: seoMetaZod,
  }),
});

export const updateBlogSchema = z.object({
  body: z.object({
    title: z.string().min(3).optional(),
    content: z.string().min(10).optional(),
    excerpt: z.string().optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
    isPublished: z.boolean().optional(),
    featuredImage: z.object({
      url: z.string().optional(),
      publicId: z.string().optional(),
      alt: z.string().optional(),
    }).optional(),
    metaTitle: z.string().max(160).optional(),
    metaDescription: z.string().max(320).optional(),
    seo: seoMetaZod,
  }),
});

export const deliveryLocationSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    deliveryFee: z.number().min(0),
    isActive: z.boolean().optional(),
    sortOrder: z.number().optional(),
    timeSlotsEnabled: z.boolean().optional(),
    timeSlots: z.array(z.object({
      id: z.string().min(1),
      label: z.string().min(1),
      start: z.string().optional(),
      end: z.string().optional(),
      fee: z.number().min(0).optional(),
      enabled: z.boolean().optional(),
      sortOrder: z.number().optional(),
    })).optional(),
  }),
});

export const deliveryGroupSchema = z.object({
  body: z.object({
    name: z.string().min(2),
    code: z.string().optional(),
    coverageLocations: z.array(z.string()).optional(),
    deliveryMethod: z.enum(['local_arrangement', 'courier_local', 'courier']).optional(),
    estimatedDeliveryLabel: z.string().optional(),
    estimatedDays: z.object({
      min: z.number().min(0).optional(),
      max: z.number().min(0).optional(),
    }).optional(),
    estimatedHours: z.number().min(0).optional(),
    cutoffTime: z.string().optional(),
    categories: z.array(z.string()).optional(),
    products: z.array(z.string()).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().optional(),
  }),
});

export const categoryDeliverySchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    deliveryScope: z.enum(['all', 'selected']).optional(),
    deliveryGroupRules: z.array(z.object({
      group: z.string(),
      available: z.boolean().optional(),
      sameDay: z.boolean().optional(),
      estimatedDays: z.object({
        min: z.number().min(0).optional(),
        max: z.number().min(0).optional(),
      }).optional(),
    })).optional(),
  }),
});

const categoryImageSchema = z.object({
  url: z.string().optional(),
  publicId: z.string().optional(),
  alt: z.string().optional(),
}).optional();

const categoryBodySchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens only').optional(),
  description: z.string().max(2000).optional(),
  image: categoryImageSchema,
  parent: z.string().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().optional(),
  metaTitle: z.string().max(160).optional(),
  metaDescription: z.string().max(320).optional(),
  seo: seoMetaZod,
  deliveryScope: z.enum(['all', 'selected']).optional(),
  deliveryGroupRules: z.array(z.object({
    group: z.string(),
    available: z.boolean().optional(),
    sameDay: z.boolean().optional(),
    estimatedDays: z.object({
      min: z.number().min(0).optional(),
      max: z.number().min(0).optional(),
    }).optional(),
  })).optional(),
});

export const createCategorySchema = z.object({
  body: categoryBodySchema,
});

export const updateCategorySchema = z.object({
  body: categoryBodySchema.partial(),
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

const couponBodySchema = z.object({
  code: z.string().min(2).max(40),
  name: z.string().min(2),
  description: z.string().optional(),
  discountType: z.enum(['flat', 'percent', 'percent_capped']),
  appliesTo: z.enum(['order', 'category', 'shipping', 'payment_gateway']),
  value: z.number().min(0),
  maxDiscount: z.number().min(0).optional(),
  categoryIds: z.array(z.string()).optional(),
  paymentGatewayIds: z.array(z.string()).optional(),
  minOrderAmount: z.number().min(0).optional(),
  maxUses: z.number().min(0).optional(),
  perUserLimit: z.number().min(0).optional(),
  startsAt: z.union([z.string(), z.date()]).optional().nullable(),
  expiresAt: z.union([z.string(), z.date()]).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const createCouponSchema = z.object({ body: couponBodySchema });
export const updateCouponSchema = z.object({ body: couponBodySchema.partial() });

export const validateCouponSchema = z.object({
  body: z.object({
    code: z.string().min(2).optional(),
    items: z.array(z.object({
      productId: z.string(),
      variantId: z.string().optional(),
      quantity: z.number().min(1),
      unitPrice: z.number().min(0).optional(),
    })).min(1),
    paymentMethod: z.enum(['khalti', 'esewa', 'imepay', 'fonepay', 'card', 'hbl', 'manual_bank', 'cod']).optional(),
    deliveryLocationId: z.string().optional(),
    deliveryGroupId: z.string().optional(),
    serviceAddonIds: z.array(z.string()).optional(),
    timeSlotId: z.string().optional(),
  }),
});

export const createReminderSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    occasionDate: z.union([z.string(), z.date()]),
    recipientName: z.string().optional(),
    relation: z.string().optional(),
    deliveryLocationText: z.string().optional(),
    notes: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateReminderSchema = z.object({
  body: z.object({
    title: z.string().optional(),
    occasionDate: z.union([z.string(), z.date()]).optional(),
    recipientName: z.string().optional(),
    relation: z.string().optional(),
    deliveryLocationText: z.string().optional(),
    notes: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled', 'refunded']),
    note: z.string().optional(),
  }),
});

export const updateOrderPaymentSchema = z.object({
  body: z.object({
    status: z.enum(['pending', 'paid', 'failed', 'refunded']),
    transactionId: z.string().optional(),
    note: z.string().optional(),
  }),
});

export const confirmLeadOrderSchema = z.object({
  body: z.object({
    transactionId: z.string().optional(),
    note: z.string().optional(),
  }),
});

export const cancelLeadOrderSchema = z.object({
  body: z.object({
    note: z.string().optional(),
  }),
});

const cmsPageTypeSchema = z.enum(['home', 'about', 'contact', 'faq', 'terms', 'privacy', 'custom']);
const cmsSlugSchema = z.string().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers, and hyphens only');

export const createCmsPageSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(120),
    slug: cmsSlugSchema,
    pageType: cmsPageTypeSchema.default('custom'),
    isPublished: z.boolean().optional(),
    metaTitle: z.string().max(160).optional(),
    metaDescription: z.string().max(320).optional(),
    seo: seoMetaZod,
  }),
});

export const updateCmsPageSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(120).optional(),
    slug: cmsSlugSchema.optional(),
    pageType: cmsPageTypeSchema.optional(),
    isPublished: z.boolean().optional(),
    metaTitle: z.string().max(160).optional(),
    metaDescription: z.string().max(320).optional(),
    seo: seoMetaZod,
  }),
});

export const cloneCmsPageSchema = z.object({
  body: z.object({
    title: z.string().min(2).max(120).optional(),
    slug: cmsSlugSchema.optional(),
    pageType: cmsPageTypeSchema.optional(),
    isPublished: z.boolean().optional(),
  }),
});

export const fetchGoogleReviewsSchema = z.object({
  body: z.object({
    placeId: z.string().min(5).max(200),
  }),
});

const partnerItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0).optional(),
  variantId: z.string().optional(),
  giftMessage: z.string().optional(),
});

const partnerSenderSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(6),
  countryCode: z.string().optional(),
});

const partnerReceiverSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(6),
  countryCode: z.string().optional(),
  address: z.string().min(3),
});

const partnerOrderBodyBase = z.object({
  items: z.array(partnerItemSchema).min(1),
  sender: partnerSenderSchema,
  receiver: partnerReceiverSchema,
  deliveryLocationId: z.string(),
  deliveryDate: z.union([z.string(), z.date()]).optional(),
  preferredDeliveryDate: z.union([z.string(), z.date()]).optional(),
  timeSlotId: z.string().optional(),
  giftMessage: z.string().optional(),
  occasion: z.string().optional(),
  notes: z.string().optional(),
  specialInstructions: z.string().optional(),
  serviceAddonIds: z.array(z.string()).optional(),
  externalReference: z.string().optional(),
  partnerOrderRef: z.string().optional(),
});

export const partnerQuoteSchema = z.object({
  body: partnerOrderBodyBase,
});

export const partnerCreateOrderSchema = z.object({
  body: partnerOrderBodyBase.extend({
    expectedTotal: z.number().min(0).optional(),
  }),
});

export const partnerPaymentConfirmSchema = z.object({
  body: z.object({
    receiverName: z.string().min(1),
    receiverMobile: z.string().min(6),
    expectedTotal: z.number().min(0).optional(),
    transactionReference: z.string().optional(),
    transactionId: z.string().optional(),
  }),
});

const partnerOrderFieldSchema = z.object({
  key: z.string(),
  label: z.string(),
  enabled: z.boolean(),
  required: z.boolean(),
});

export const createApiPartnerSchema = z.object({
  body: z.object({
    integrationName: z.string().min(2).max(120),
    companyName: z.string().optional(),
    contactPerson: z.string().optional(),
    email: z.string().email().optional(),
    status: z.enum(['active', 'disabled']).optional(),
    allowAllProducts: z.boolean().optional(),
    allowedProducts: z.array(z.string()).optional(),
    allowedDeliveryLocations: z.array(z.string()).optional(),
    orderFields: z.array(partnerOrderFieldSchema).optional(),
    ipWhitelist: z.array(z.string()).optional(),
    rateLimitPerMinute: z.number().min(10).max(1000).optional(),
  }),
});

export const updateApiPartnerSchema = z.object({
  body: z.object({
    integrationName: z.string().min(2).max(120).optional(),
    companyName: z.string().optional(),
    contactPerson: z.string().optional(),
    email: z.string().email().optional(),
    status: z.enum(['active', 'disabled']).optional(),
    allowAllProducts: z.boolean().optional(),
    allowedProducts: z.array(z.string()).optional(),
    allowedDeliveryLocations: z.array(z.string()).optional(),
    orderFields: z.array(partnerOrderFieldSchema).optional(),
    ipWhitelist: z.array(z.string()).optional(),
    rateLimitPerMinute: z.number().min(10).max(1000).optional(),
  }),
});

const purchaseItemSchema = z.object({
  product: z.string().optional(),
  name: z.string().min(1),
  sku: z.string().optional(),
  quantity: z.number().min(1),
  unitCost: z.number().min(0),
});

export const createVendorSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    companyName: z.string().optional(),
    contactPerson: z.string().optional(),
    email: z.string().email().optional().or(z.literal('')),
    phone: z.string().optional(),
    address: z.string().optional(),
    paymentTerms: z.string().optional(),
    billType: z.enum(['pan', 'vat', 'normal']).optional(),
    panNumber: z.string().optional(),
    vatNumber: z.string().optional(),
    notes: z.string().optional(),
    status: z.enum(['active', 'inactive']).optional(),
  }),
});

export const updateVendorSchema = createVendorSchema;

export const createPurchaseSchema = z.object({
  body: z.object({
    vendor: z.string().min(1),
    purchaseDate: z.string().optional(),
    purchaseType: z.enum(['vat_13', 'non_vat', 'zero_rated', 'pan_bill', 'normal_bill']).optional(),
    items: z.array(purchaseItemSchema).min(1),
    tax: z.number().min(0).optional(),
    shipping: z.number().min(0).optional(),
    paymentStatus: z.enum(['pending', 'paid', 'partial']).optional(),
    paidAmount: z.number().min(0).optional(),
    treasuryAccount: z.string().optional(),
    invoiceRef: z.string().optional(),
    notes: z.string().optional(),
    stockReceived: z.boolean().optional(),
  }),
});

export const createExpenseSchema = z.object({
  body: z.object({
    category: z.enum(['rent', 'utilities', 'salaries', 'marketing', 'logistics', 'maintenance', 'other']).optional(),
    title: z.string().min(2).max(200),
    description: z.string().optional(),
    amount: z.number().min(0),
    expenseDate: z.string().optional(),
    paymentStatus: z.enum(['pending', 'paid']).optional(),
    vendor: z.string().optional(),
    treasuryAccount: z.string().optional(),
    reference: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const createTreasuryAccountSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(120),
    type: z.enum(['cash', 'bank', 'mobile_wallet', 'other']).optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    openingBalance: z.number().optional(),
    currency: z.string().optional(),
    isActive: z.boolean().optional(),
    notes: z.string().optional(),
  }),
});

export const createTreasuryTransactionSchema = z.object({
  body: z.object({
    accountId: z.string().min(1),
    type: z.enum(['deposit', 'withdrawal', 'transfer_in', 'transfer_out']),
    amount: z.number().min(0.01),
    description: z.string().optional(),
    reference: z.string().optional(),
    transactionDate: z.string().optional(),
  }),
});

export const adjustTreasuryBalanceSchema = z.object({
  body: z
    .object({
      mode: z.enum(['increase', 'decrease', 'set']),
      amount: z.number().min(0.01).optional(),
      newBalance: z.number().min(0).optional(),
      reason: z.string().min(2).max(500),
      transactionDate: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (data.mode === 'set') {
        if (data.newBalance === undefined || data.newBalance === null) {
          ctx.addIssue({ code: 'custom', message: 'New balance is required', path: ['newBalance'] });
        }
      } else if (!data.amount || data.amount <= 0) {
        ctx.addIssue({ code: 'custom', message: 'Amount is required', path: ['amount'] });
      }
    }),
});
