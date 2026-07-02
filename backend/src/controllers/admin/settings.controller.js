import * as settingsService from '../../services/settings.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getSettings(req.query.group);
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
