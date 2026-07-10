import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { User, AdminTrustedDevice, AdminLoginChallenge } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../config/constants.js';
import { validatePhoneForCountry } from '../utils/phone.js';
import { linkGuestOrdersToUser } from './order.service.js';
import { sendEmail } from './email.service.js';
import {
  generateOtpCode,
  hashDeviceFingerprint,
  hashOtp,
  isStaffRole,
  parseDeviceLabel,
} from '../utils/adminDevice.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
  const refreshToken = jwt.sign({ id: userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
  return { accessToken, refreshToken };
};

const completeLogin = async (user) => {
  const tokens = generateTokens(user._id);
  user.refreshToken = tokens.refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });
  await linkGuestOrdersToUser(user._id, user.email);
  return { user: user.toSafeObject(), ...tokens };
};

const maskEmail = (email = '') => {
  const [local, domain] = String(email).split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'*'.repeat(Math.max(3, local.length - 2))}@${domain}`;
};

const sendAdminLoginOtpEmail = async ({ to, name, otp, deviceLabel, ipAddress }) => {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
      <h2 style="margin:0 0 12px">Admin login verification</h2>
      <p>Hi ${name || 'Admin'},</p>
      <p>We detected a sign-in attempt from a new or unrecognized device:</p>
      <ul>
        <li><strong>Device:</strong> ${deviceLabel || 'Unknown device'}</li>
        ${ipAddress ? `<li><strong>IP:</strong> ${ipAddress}</li>` : ''}
      </ul>
      <p>Your one-time verification code is:</p>
      <p style="font-size:28px;letter-spacing:6px;font-weight:700;margin:16px 0">${otp}</p>
      <p>This code expires in <strong>10 minutes</strong>. If you did not try to sign in, change your password immediately.</p>
    </div>
  `;

  await sendEmail({
    to,
    subject: 'Your KoseliXpress admin login code',
    html,
    text: `Your admin login code is ${otp}. Device: ${deviceLabel}. Expires in 10 minutes.`,
  });
};

const createAdminOtpChallenge = async ({
  user,
  fingerprint,
  userAgent,
  deviceLabel,
  ipAddress,
  trustDevice = true,
}) => {
  if (!fingerprint) {
    throw new ApiError(400, 'Device fingerprint is required for admin login');
  }

  const fingerprintHash = hashDeviceFingerprint(fingerprint, user._id);
  const otp = generateOtpCode();
  const label = deviceLabel || parseDeviceLabel(userAgent);

  await AdminLoginChallenge.deleteMany({ user: user._id });

  const challenge = await AdminLoginChallenge.create({
    user: user._id,
    email: user.email,
    otpHash: hashOtp(otp),
    fingerprintHash,
    deviceLabel: label,
    userAgent: userAgent || '',
    ipAddress: ipAddress || '',
    trustDevice: trustDevice !== false,
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });

  try {
    await sendAdminLoginOtpEmail({
      to: user.email,
      name: user.name,
      otp,
      deviceLabel: label,
      ipAddress,
    });
  } catch (err) {
    await AdminLoginChallenge.deleteOne({ _id: challenge._id });
    throw new ApiError(
      err.statusCode || 503,
      err.message || 'Could not send verification email. Check SMTP settings.'
    );
  }

  return {
    requiresOtp: true,
    challengeId: challenge._id,
    emailHint: maskEmail(user.email),
    deviceLabel: label,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
  };
};

export const register = async ({ name, email, countryCode = '+977', phone, password }) => {
  const { getSettingByKey } = await import('./settings.service.js');
  try {
    const regSetting = await getSettingByKey('registration_enabled');
    if (regSetting.value === false) throw new ApiError(403, 'Registration is currently disabled');
  } catch (err) {
    if (err.statusCode === 403) throw err;
  }

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'Email already registered');

  const phoneErr = validatePhoneForCountry(phone, countryCode);
  if (phoneErr) throw new ApiError(400, phoneErr);

  const user = await User.create({
    name,
    email,
    countryCode,
    phone: String(phone).replace(/\D/g, ''),
    password,
    role: ROLES.CUSTOMER,
  });

  const tokens = generateTokens(user._id);
  user.refreshToken = tokens.refreshToken;
  await user.save({ validateBeforeSave: false });

  await linkGuestOrdersToUser(user._id, user.email);

  return { user: user.toSafeObject(), ...tokens };
};

export const login = async ({
  email,
  password,
  deviceFingerprint,
  userAgent,
  deviceLabel,
  ipAddress,
  trustDevice = true,
}) => {
  const user = await User.findOne({ email }).select('+password +refreshToken');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.isActive) throw new ApiError(403, 'Account is deactivated');

  if (!isStaffRole(user.role)) {
    return completeLogin(user);
  }

  const fingerprint = String(deviceFingerprint || '').trim();
  if (!fingerprint) {
    throw new ApiError(400, 'Device verification required for admin login');
  }

  const fingerprintHash = hashDeviceFingerprint(fingerprint, user._id);
  const trusted = await AdminTrustedDevice.findOne({
    user: user._id,
    fingerprintHash,
  });

  if (trusted) {
    trusted.lastUsedAt = new Date();
    trusted.userAgent = userAgent || trusted.userAgent;
    trusted.ipAddress = ipAddress || trusted.ipAddress;
    if (deviceLabel) trusted.deviceLabel = deviceLabel;
    await trusted.save();
    return completeLogin(user);
  }

  return createAdminOtpChallenge({
    user,
    fingerprint,
    userAgent,
    deviceLabel,
    ipAddress,
    trustDevice,
  });
};

export const verifyAdminLoginOtp = async ({
  challengeId,
  otp,
  deviceFingerprint,
  trustDevice,
}) => {
  if (!challengeId || !otp) {
    throw new ApiError(400, 'Verification code is required');
  }

  const challenge = await AdminLoginChallenge.findById(challengeId).select('+otpHash');
  if (!challenge) throw new ApiError(400, 'Verification session expired. Please sign in again.');
  if (challenge.expiresAt.getTime() < Date.now()) {
    await challenge.deleteOne();
    throw new ApiError(400, 'Verification code expired. Please sign in again.');
  }

  if (challenge.attempts >= OTP_MAX_ATTEMPTS) {
    await challenge.deleteOne();
    throw new ApiError(429, 'Too many invalid attempts. Please sign in again.');
  }

  const fingerprint = String(deviceFingerprint || '').trim();
  if (!fingerprint) {
    throw new ApiError(400, 'Device verification required');
  }

  const fingerprintHash = hashDeviceFingerprint(fingerprint, challenge.user);
  if (fingerprintHash !== challenge.fingerprintHash) {
    throw new ApiError(400, 'Device mismatch. Please sign in again from this device.');
  }

  if (hashOtp(otp) !== challenge.otpHash) {
    challenge.attempts += 1;
    await challenge.save();
    const remaining = OTP_MAX_ATTEMPTS - challenge.attempts;
    throw new ApiError(400, remaining > 0
      ? `Invalid verification code. ${remaining} attempt(s) left.`
      : 'Invalid verification code. Please sign in again.');
  }

  const user = await User.findById(challenge.user).select('+refreshToken');
  if (!user || !user.isActive) {
    await challenge.deleteOne();
    throw new ApiError(403, 'Account is deactivated');
  }

  const shouldTrust = trustDevice !== undefined ? trustDevice !== false : challenge.trustDevice;
  if (shouldTrust) {
    await AdminTrustedDevice.findOneAndUpdate(
      { user: user._id, fingerprintHash },
      {
        user: user._id,
        fingerprintHash,
        deviceLabel: challenge.deviceLabel,
        userAgent: challenge.userAgent,
        ipAddress: challenge.ipAddress,
        lastUsedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  await challenge.deleteOne();
  return completeLogin(user);
};

export const resendAdminLoginOtp = async ({ challengeId, deviceFingerprint }) => {
  const challenge = await AdminLoginChallenge.findById(challengeId);
  if (!challenge) throw new ApiError(400, 'Verification session expired. Please sign in again.');

  const fingerprint = String(deviceFingerprint || '').trim();
  const fingerprintHash = hashDeviceFingerprint(fingerprint, challenge.user);
  if (fingerprintHash !== challenge.fingerprintHash) {
    throw new ApiError(400, 'Device mismatch. Please sign in again from this device.');
  }

  const user = await User.findById(challenge.user);
  if (!user || !user.isActive) throw new ApiError(403, 'Account is deactivated');

  const otp = generateOtpCode();
  challenge.otpHash = hashOtp(otp);
  challenge.attempts = 0;
  challenge.expiresAt = new Date(Date.now() + OTP_TTL_MS);
  await challenge.save();

  await sendAdminLoginOtpEmail({
    to: user.email,
    name: user.name,
    otp,
    deviceLabel: challenge.deviceLabel,
    ipAddress: challenge.ipAddress,
  });

  return {
    requiresOtp: true,
    challengeId: challenge._id,
    emailHint: maskEmail(user.email),
    deviceLabel: challenge.deviceLabel,
    expiresInSeconds: Math.floor(OTP_TTL_MS / 1000),
  };
};

export const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) throw new ApiError(401, 'Refresh token required');

  const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret);
  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== refreshToken) {
    throw new ApiError(401, 'Invalid refresh token');
  }

  const tokens = generateTokens(user._id);
  user.refreshToken = tokens.refreshToken;
  await user.save({ validateBeforeSave: false });

  return tokens;
};

export const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

export const getProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new ApiError(404, 'User not found');
  return user.toSafeObject();
};

export const updateProfile = async (userId, data) => {
  const allowed = ['name', 'countryCode', 'phone', 'avatar', 'addresses'];
  const updates = {};
  for (const key of allowed) {
    if (data[key] !== undefined) updates[key] = data[key];
  }

  if (updates.phone !== undefined) {
    const existing = await User.findById(userId);
    const countryCode = updates.countryCode ?? existing?.countryCode ?? '+977';
    const phoneErr = validatePhoneForCountry(updates.phone, countryCode);
    if (phoneErr) throw new ApiError(400, phoneErr);
    updates.phone = String(updates.phone).replace(/\D/g, '');
  }

  const user = await User.findByIdAndUpdate(userId, updates, {
    new: true,
    runValidators: true,
  });
  if (!user) throw new ApiError(404, 'User not found');
  return user.toSafeObject();
};

export const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw new ApiError(404, 'User not found');
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(400, 'Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();
};
