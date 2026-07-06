import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import ApiPartner from '../models/ApiPartner.model.js';
import ApiPartnerLog from '../models/ApiPartnerLog.model.js';
import { ApiError } from '../utils/ApiError.js';
import { DEFAULT_API_PARTNER_ORDER_FIELDS } from '../config/apiPartnerDefaults.js';

const slugify = (value) =>
  String(value || 'partner')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'partner';

const randomToken = (bytes = 24) => crypto.randomBytes(bytes).toString('hex');

export const generateCredentials = async (integrationName, existingUsername) => {
  let apiUsername = existingUsername || slugify(integrationName);
  if (!existingUsername) {
    let suffix = 0;
    while (await ApiPartner.exists({ apiUsername })) {
      suffix += 1;
      apiUsername = `${slugify(integrationName)}-${suffix}`;
    }
  }

  const apiKey = `kx_${randomToken(16)}`;
  const apiSecret = `kxs_${randomToken(32)}`;
  const apiSecretHash = await bcrypt.hash(apiSecret, 10);

  return { apiUsername, apiKey, apiSecret, apiSecretHash };
};

export const listPartners = async ({ page = 1, limit = 20, search = '' } = {}) => {
  const filter = {};
  if (search?.trim()) {
    const q = search.trim();
    filter.$or = [
      { integrationName: new RegExp(q, 'i') },
      { companyName: new RegExp(q, 'i') },
      { apiUsername: new RegExp(q, 'i') },
      { email: new RegExp(q, 'i') },
    ];
  }

  const skip = (page - 1) * limit;
  const [partners, total] = await Promise.all([
    ApiPartner.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-apiSecretHash'),
    ApiPartner.countDocuments(filter),
  ]);

  return { partners, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const getPartnerById = async (id) => {
  const partner = await ApiPartner.findById(id)
    .populate('allowedProducts', 'name slug sku price isActive')
    .populate('allowedDeliveryLocations', 'name deliveryFee isActive')
    .select('-apiSecretHash');
  if (!partner) throw new ApiError(404, 'API partner not found');
  return partner;
};

export const createPartner = async (data, userId) => {
  const creds = await generateCredentials(data.integrationName);
  const partner = await ApiPartner.create({
    integrationName: data.integrationName,
    companyName: data.companyName,
    contactPerson: data.contactPerson,
    email: data.email,
    apiUsername: creds.apiUsername,
    apiKey: creds.apiKey,
    apiSecretHash: creds.apiSecretHash,
    status: data.status || 'active',
    allowAllProducts: Boolean(data.allowAllProducts),
    allowedProducts: data.allowAllProducts ? [] : (data.allowedProducts || []),
    allowedDeliveryLocations: data.allowedDeliveryLocations || [],
    orderFields: data.orderFields?.length ? data.orderFields : [...DEFAULT_API_PARTNER_ORDER_FIELDS],
    ipWhitelist: data.ipWhitelist || [],
    rateLimitPerMinute: data.rateLimitPerMinute || 120,
    credentialsRotatedAt: new Date(),
    createdBy: userId,
  });

  const doc = partner.toObject();
  delete doc.apiSecretHash;
  return { partner: doc, credentials: { apiUsername: creds.apiUsername, apiKey: creds.apiKey, apiSecret: creds.apiSecret } };
};

export const updatePartner = async (id, data) => {
  const partner = await ApiPartner.findById(id);
  if (!partner) throw new ApiError(404, 'API partner not found');

  const fields = [
    'integrationName',
    'companyName',
    'contactPerson',
    'email',
    'status',
    'allowAllProducts',
    'allowedProducts',
    'allowedDeliveryLocations',
    'orderFields',
    'ipWhitelist',
    'rateLimitPerMinute',
  ];

  fields.forEach((key) => {
    if (data[key] !== undefined) partner[key] = data[key];
  });

  if (data.allowAllProducts) {
    partner.allowedProducts = [];
  }

  await partner.save();
  return getPartnerById(partner._id);
};

export const deletePartner = async (id) => {
  const partner = await ApiPartner.findByIdAndDelete(id);
  if (!partner) throw new ApiError(404, 'API partner not found');
  await ApiPartnerLog.deleteMany({ partner: id });
};

export const resetPartnerCredentials = async (id) => {
  const partner = await ApiPartner.findById(id);
  if (!partner) throw new ApiError(404, 'API partner not found');

  const creds = await generateCredentials(partner.integrationName, partner.apiUsername);
  partner.apiKey = creds.apiKey;
  partner.apiSecretHash = creds.apiSecretHash;
  partner.credentialsRotatedAt = new Date();
  await partner.save();

  const doc = partner.toObject();
  delete doc.apiSecretHash;
  return {
    partner: doc,
    credentials: { apiUsername: partner.apiUsername, apiKey: creds.apiKey, apiSecret: creds.apiSecret },
  };
};

export const authenticatePartner = async ({ apiUsername, apiKey, apiSecret }) => {
  if (!apiUsername || !apiKey || !apiSecret) {
    throw new ApiError(401, 'API credentials required');
  }

  const partner = await ApiPartner.findOne({
    apiUsername: String(apiUsername).trim().toLowerCase(),
    apiKey: String(apiKey).trim(),
    status: 'active',
  }).select('+apiSecretHash');

  if (!partner) throw new ApiError(401, 'Invalid API credentials');

  const valid = await bcrypt.compare(String(apiSecret), partner.apiSecretHash);
  if (!valid) throw new ApiError(401, 'Invalid API credentials');

  partner.lastUsedAt = new Date();
  await partner.save({ validateBeforeSave: false });

  const safe = partner.toObject();
  delete safe.apiSecretHash;
  return safe;
};

export const logPartnerRequest = async ({
  partnerId,
  method,
  path,
  statusCode,
  ip,
  userAgent,
  requestBody,
  responseSummary,
  errorMessage,
  durationMs,
}) => {
  try {
    await ApiPartnerLog.create({
      partner: partnerId,
      method,
      path,
      statusCode,
      ip,
      userAgent,
      requestBody: sanitizeLogBody(requestBody),
      responseSummary,
      errorMessage,
      durationMs,
    });
  } catch {
    /* non-blocking */
  }
};

const sanitizeLogBody = (body) => {
  if (!body || typeof body !== 'object') return body;
  const clone = { ...body };
  ['apiSecret', 'password', 'cardNumber'].forEach((k) => {
    if (clone[k]) clone[k] = '[redacted]';
  });
  return clone;
};

export const getPartnerLogs = async (partnerId, { page = 1, limit = 50 } = {}) => {
  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    ApiPartnerLog.find({ partner: partnerId }).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ApiPartnerLog.countDocuments({ partner: partnerId }),
  ]);
  return { logs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
};

export const buildPartnerDocumentation = (partner, baseUrl) => {
  const apiBase = `${baseUrl}/api/v1/partner`;
  const enabledFields = (partner.orderFields || []).filter((f) => f.enabled);
  const requiredFields = enabledFields.filter((f) => f.required);

  return `# ${partner.integrationName} — Koseli Xpress Partner API

Base URL: \`${apiBase}\`

## Authentication (HTTPS only)

Send on every request:
- \`x-api-username\`: ${partner.apiUsername}
- \`x-api-key\`: your API key
- \`x-api-secret\`: your API secret

## Fixed business rules

- Currency: **NPR** (not overridable)
- Payment method: **manual_bank** (not overridable)
- New orders status: **Pending Payment**

## Allowed delivery locations

${(partner.allowedDeliveryLocations || []).map((l) => `- ${l.name || l._id}`).join('\n') || '- (none configured)'}

## Allowed products

${partner.allowAllProducts ? '- All active products' : ((partner.allowedProducts || []).map((p) => `- ${p.name || p._id}`).join('\n') || '- (none configured)')}

## Enabled order fields

${enabledFields.map((f) => `- ${f.label} (\`${f.key}\`)${f.required ? ' **required**' : ''}`).join('\n')}

Required: ${requiredFields.map((f) => f.key).join(', ') || 'none'}

## Endpoints

### GET /delivery-locations
Returns allowed delivery locations for this partner.

### GET /products?deliveryLocationId=&deliveryDate=&q=
Search eligible products (mapped, in stock, deliverable to location/date).

### POST /quote
Body: sender, receiver, deliveryLocationId, items[], optional deliveryDate, timeSlotId, giftMessage, etc.
Returns Koseli Xpress calculated pricing (subtotal, delivery, total).

### POST /orders
Creates order after quote validation. Returns orderNumber + trackingUrl.

### GET /orders/:orderNumber/lookup?receiverName=&receiverMobile=
Lookup unpaid website order for partner payment flow.

### POST /orders/:orderNumber/payment-confirm
Confirm payment for pending order (receiver details must match).

### GET /manual-payment-instructions
Bank/QR manual payment details configured in admin.
`;
};
