import crypto from 'crypto';

export const STAFF_ROLES = new Set(['super_admin', 'admin', 'staff']);

export const isStaffRole = (role) => STAFF_ROLES.has(role);

export const hashDeviceFingerprint = (fingerprint, userId) =>
  crypto
    .createHash('sha256')
    .update(`${String(userId)}:${String(fingerprint || '').trim()}`)
    .digest('hex');

export const hashOtp = (otp) =>
  crypto.createHash('sha256').update(String(otp)).digest('hex');

export const generateOtpCode = () =>
  String(Math.floor(100000 + Math.random() * 900000));

export const parseDeviceLabel = (userAgent = '') => {
  const ua = String(userAgent || '');
  if (!ua) return 'Unknown device';

  let browser = 'Browser';
  if (/Edg\//i.test(ua)) browser = 'Edge';
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = 'Chrome';
  else if (/Firefox\//i.test(ua)) browser = 'Firefox';
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = 'Safari';

  let os = 'Unknown OS';
  if (/Windows NT/i.test(ua)) os = 'Windows';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua) ? 'Mobile' : 'Desktop';
  return `${browser} on ${os} (${mobile})`;
};

export const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || '';
};
