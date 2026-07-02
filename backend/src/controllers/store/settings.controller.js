import * as navbarService from '../../services/navbar.service.js';
import * as settingsService from '../../services/settings.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getNavbars = asyncHandler(async (req, res) => {
  const navbars = await navbarService.getNavbars(req.query.location);
  res.json(new ApiResponse(200, navbars));
});

export const getSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.getPublicSettings();
  res.json(new ApiResponse(200, settings));
});
