import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../config/constants.js';

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
  const refreshToken = jwt.sign({ id: userId }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
  return { accessToken, refreshToken };
};

export const register = async ({ name, email, phone, password }) => {
  const { getSettingByKey } = await import('./settings.service.js');
  try {
    const regSetting = await getSettingByKey('registration_enabled');
    if (regSetting.value === false) throw new ApiError(403, 'Registration is currently disabled');
  } catch (err) {
    if (err.statusCode === 403) throw err;
  }

  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'Email already registered');

  const user = await User.create({
    name,
    email,
    phone,
    password,
    role: ROLES.CUSTOMER,
  });

  const tokens = generateTokens(user._id);
  user.refreshToken = tokens.refreshToken;
  await user.save({ validateBeforeSave: false });

  return { user: user.toSafeObject(), ...tokens };
};

export const login = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password +refreshToken');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.isActive) throw new ApiError(403, 'Account is deactivated');

  const tokens = generateTokens(user._id);
  user.refreshToken = tokens.refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  return { user: user.toSafeObject(), ...tokens };
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
  const allowed = ['name', 'phone', 'avatar', 'addresses'];
  const updates = {};
  for (const key of allowed) {
    if (data[key] !== undefined) updates[key] = data[key];
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
