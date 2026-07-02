import * as authService from '../services/auth.service.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.validated.body);
  res
    .status(201)
    .cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json(new ApiResponse(201, result, 'Registration successful'));
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.validated.body);
  res
    .cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    })
    .json(new ApiResponse(200, result, 'Login successful'));
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
