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
  },

  email: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'KoseliXpress <noreply@koselixpress.com>',
  },

  upload: {
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 5,
    allowedImageTypes: (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp,image/gif').split(','),
  },

  google: {
    placesApiKey: process.env.GOOGLE_PLACES_API_KEY || '',
  },
};

export default config;
