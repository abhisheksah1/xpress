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
    slug: z.string().optional(),
    sku: z.string().optional(),
    description: z.string().optional(),
    shortDescription: z.string().optional(),
    longDescription: z.string().optional(),
    additionalNote: z.string().optional(),
    category: z.string(),
    categories: z.array(z.string()).optional(),
    brand: z.string().optional(),
    price: z.number().min(0),
    compareAtPrice: z.number().min(0).optional(),
    costPrice: z.number().min(0).optional(),
    stock: z.number().min(0).optional(),
    lowStockThreshold: z.number().min(0).optional(),
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
      product: z.string(),
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
    isPublished: z.boolean().optional(),
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
