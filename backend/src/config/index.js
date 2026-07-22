import dotenv from 'dotenv';

dotenv.config();

const requiredEnv = ['MONGODB_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  apiVersion: process.env.API_VERSION || 'v1',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  adminUrl: process.env.ADMIN_URL || 'http://localhost:5173/admin',
  serverUrl: process.env.SERVER_URL || `http://localhost:${parseInt(process.env.PORT, 10) || 5000}`,
  /** Comma-separated extra browser origins allowed by CORS (e.g. https://www.example.com,https://admin.example.com) */
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  /** Cookie SameSite: use "none" when frontend and API are on different domains (requires HTTPS). */
  cookieSameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),

  db: {
    uri: process.env.MONGODB_URI,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  superAdmin: {
    name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
    email: process.env.SUPER_ADMIN_EMAIL || 'admin@koselixpress.com',
    password: process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe@123',
    phone: process.env.SUPER_ADMIN_PHONE || '9800000000',
  },

  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    folder: process.env.CLOUDINARY_FOLDER || 'koselixpress',
  },

  payments: {
    khalti: {
      secretKey: process.env.KHALTI_SECRET_KEY,
      publicKey: process.env.KHALTI_PUBLIC_KEY,
      verifyUrl: process.env.KHALTI_VERIFY_URL,
    },
    esewa: {
      merchantCode: process.env.ESEWA_MERCHANT_CODE,
      secretKey: process.env.ESEWA_SECRET_KEY,
      verifyUrl: process.env.ESEWA_VERIFY_URL,
    },
    fonepay: {
      merchantCode: process.env.FONEPAY_MERCHANT_CODE,
      secretKey: process.env.FONEPAY_SECRET_KEY,
      verifyUrl: process.env.FONEPAY_VERIFY_URL,
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
      currency: process.env.STRIPE_CURRENCY || 'npr',
    },
    nps: {
      merchantId: process.env.NPS_MERCHANT_ID,
      merchantName: process.env.NPS_MERCHANT_NAME,
      secretKey: process.env.NPS_SECRET_KEY,
      apiUsername: process.env.NPS_API_USERNAME,
      apiPassword: process.env.NPS_API_PASSWORD,
      instrumentCode: process.env.NPS_INSTRUMENT_CODE || '',
      environment: process.env.NPS_ENVIRONMENT === 'production' ? 'production' : 'sandbox',
    },
  },

  email: {
    brevoApiKey: process.env.BREVO_API_KEY || '',
    smtpLogin: process.env.BREVO_SMTP_LOGIN || '',
    smtpKey: process.env.BREVO_SMTP_KEY || '',
    senderEmail: process.env.BREVO_SENDER_EMAIL || '',
    senderName: process.env.BREVO_SENDER_NAME || 'KoseliXpress',
    /** Legacy fallback if BREVO_SENDER_EMAIL is not set */
    from: process.env.EMAIL_FROM || 'KoseliXpress <noreply@koselixpress.com>',
  },

  upload: {
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 5,
    allowedImageTypes: (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp,image/gif').split(','),
  },

  rateLimit: {
    enabled: process.env.RATE_LIMIT_ENABLED !== 'false' && process.env.NODE_ENV !== 'development',
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 500,
    authMax: parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || 30,
  },

  google: {
    placesApiKey: process.env.GOOGLE_PLACES_API_KEY || '',
  },

  /**
   * Optional path to frontend production build (e.g. ../frontend/dist).
   * When set, Express serves the SPA and injects admin SEO into index.html for crawlers.
   */
  frontendDist: process.env.FRONTEND_DIST || '',
};

export default config;
