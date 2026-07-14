import * as authService from '../services/auth.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { getClientIp, parseDeviceLabel } from '../utils/adminDevice.js';

const REFRESH_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' || process.env.COOKIE_SAME_SITE === 'none',
  sameSite: process.env.COOKIE_SAME_SITE || (process.env.NODE_ENV === 'production' ? 'none' : 'lax'),
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

const setAuthCookie = (res, refreshToken) => {
  if (!refreshToken) return res;
  return res.cookie('refreshToken', refreshToken, REFRESH_COOKIE);
};

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.validated.body);
  setAuthCookie(res, result.refreshToken)
    .status(201)
    .json(new ApiResponse(201, result, 'Registration successful'));
});

export const login = asyncHandler(async (req, res) => {
  const body = req.validated.body;
  const userAgent = body.userAgent || req.headers['user-agent'] || '';
  const result = await authService.login({
    ...body,
    userAgent,
    deviceLabel: body.deviceLabel || parseDeviceLabel(userAgent),
    ipAddress: getClientIp(req),
  });

  if (result.requiresOtp) {
    return res.json(new ApiResponse(200, result, 'Verification code sent to your email'));
  }

  setAuthCookie(res, result.refreshToken)
    .json(new ApiResponse(200, result, 'Login successful'));
});

export const verifyAdminOtp = asyncHandler(async (req, res) => {
  const result = await authService.verifyAdminLoginOtp(req.validated.body);
  setAuthCookie(res, result.refreshToken)
    .json(new ApiResponse(200, result, 'Login successful'));
});

export const resendAdminOtp = asyncHandler(async (req, res) => {
  const result = await authService.resendAdminLoginOtp(req.validated.body);
  res.json(new ApiResponse(200, result, 'Verification code resent'));
});

export const refreshToken = asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken || req.body.refreshToken;
  const tokens = await authService.refreshAccessToken(token);
  res.json(new ApiResponse(200, tokens, 'Token refreshed'));
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user._id);
  res.clearCookie('refreshToken').json(new ApiResponse(200, null, 'Logged out'));
});

export const getProfile = asyncHandler(async (req, res) => {
  const user = await authService.getProfile(req.user._id);
  res.json(new ApiResponse(200, user));
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user._id, req.body);
  res.json(new ApiResponse(200, user, 'Profile updated'));
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(req.user._id, req.body);
  res.json(new ApiResponse(200, null, 'Password changed'));
});
