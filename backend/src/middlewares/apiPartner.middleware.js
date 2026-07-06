import { ApiError } from '../utils/ApiError.js';
import * as apiPartnerService from '../services/apiPartner.service.js';

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || '';
};

export const authenticateApiPartner = async (req, res, next) => {
  const started = Date.now();
  const apiUsername = req.headers['x-api-username'];
  const apiKey = req.headers['x-api-key'];
  const apiSecret = req.headers['x-api-secret'];

  try {
    if (req.secure === false && process.env.NODE_ENV === 'production') {
      throw new ApiError(403, 'HTTPS is required for partner API access');
    }

    const partner = await apiPartnerService.authenticatePartner({ apiUsername, apiKey, apiSecret });

    const whitelist = partner.ipWhitelist || [];
    if (whitelist.length) {
      const ip = getClientIp(req);
      const allowed = whitelist.some((entry) => ip === entry || ip.endsWith(entry));
      if (!allowed) throw new ApiError(403, 'IP address not whitelisted for this API partner');
    }

    req.apiPartner = partner;
    res.on('finish', () => {
      apiPartnerService.logPartnerRequest({
        partnerId: partner._id,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'],
        requestBody: req.body,
        durationMs: Date.now() - started,
        errorMessage: res.statusCode >= 400 ? res.statusMessage : undefined,
      });
    });

    next();
  } catch (err) {
    if (apiUsername) {
      apiPartnerService.logPartnerRequest({
        partnerId: undefined,
        method: req.method,
        path: req.originalUrl,
        statusCode: err.statusCode || 401,
        ip: getClientIp(req),
        userAgent: req.headers['user-agent'],
        requestBody: req.body,
        durationMs: Date.now() - started,
        errorMessage: err.message,
      }).catch(() => {});
    }
    next(err);
  }
};

export const partnerRateLimit = (() => {
  const buckets = new Map();

  return (req, res, next) => {
    const partner = req.apiPartner;
    if (!partner) return next();

    const limit = partner.rateLimitPerMinute || 120;
    const key = String(partner._id);
    const now = Date.now();
    const windowMs = 60 * 1000;
    let bucket = buckets.get(key);

    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0 };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    if (bucket.count > limit) {
      return next(new ApiError(429, 'Partner API rate limit exceeded'));
    }
    return next();
  };
})();
