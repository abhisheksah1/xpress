import * as settingsService from '../../services/settings.service.js';
import * as emailService from '../../services/email.service.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getSettings = asyncHandler(async (req, res) => {
  const settings = req.query.groups
    ? await settingsService.getSettingsByGroups(req.query.groups.split(','))
    : await settingsService.getSettings(req.query.group);
  res.json(new ApiResponse(200, settings));
});

export const updateSetting = asyncHandler(async (req, res) => {
  const setting = await settingsService.updateSetting(req.params.key, req.body.value, req.user._id);
  res.json(new ApiResponse(200, setting, 'Setting updated'));
});

export const bulkUpdate = asyncHandler(async (req, res) => {
  const settings = await settingsService.bulkUpdateSettings(req.validated.body.settings, req.user._id);
  res.json(new ApiResponse(200, settings, 'Settings updated'));
});

export const createSetting = asyncHandler(async (req, res) => {
  const setting = await settingsService.createSetting(req.body, req.user._id);
  res.status(201).json(new ApiResponse(201, setting, 'Setting created'));
});

export const testSmtp = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Test email address required');
  await emailService.sendTestEmail(email);
  res.json(new ApiResponse(200, null, 'Test email sent'));
});
