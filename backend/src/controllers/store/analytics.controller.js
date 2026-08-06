import rateLimit from 'express-rate-limit';
import * as visitService from '../../services/visit.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import config from '../../config/index.js';

export const pageviewLimiter = config.rateLimit.enabled
  ? rateLimit({
      windowMs: 60 * 1000,
      max: 60,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many pageview events' },
    })
  : (_req, _res, next) => next();

export const recordPageView = asyncHandler(async (req, res) => {
  const visitorId = req.body?.visitorId || req.headers['x-visitor-id'];
  const path = req.body?.path || '/';
  const result = await visitService.recordPageView({ visitorId, path });
  // Always 204-ish success to avoid leaking validation to bots; keep 200 for ApiResponse consistency
  res.status(200).json(new ApiResponse(200, result));
});
