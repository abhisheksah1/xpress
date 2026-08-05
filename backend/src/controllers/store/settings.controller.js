import * as navbarService from '../../services/navbar.service.js';
import * as settingsService from '../../services/settings.service.js';
import * as paymentGatewayService from '../../services/paymentGateway.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const STORE_CONFIG_CACHE = 'public, max-age=30, stale-while-revalidate=120';

export const getNavbars = asyncHandler(async (req, res) => {
  res.set('Cache-Control', STORE_CONFIG_CACHE);
  const navbars = await navbarService.getNavbars(req.query.location);
  res.json(new ApiResponse(200, navbars));
});

export const getSettings = asyncHandler(async (req, res) => {
  res.set('Cache-Control', STORE_CONFIG_CACHE);
  const settings = await settingsService.getPublicSettings();
  res.json(new ApiResponse(200, settings));
});

export const getPaymentGateways = asyncHandler(async (req, res) => {
  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  const gateways = await paymentGatewayService.getCheckoutGateways(req.query.currency);
  res.json(new ApiResponse(200, gateways));
});
