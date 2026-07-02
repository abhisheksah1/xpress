import { Settings } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

let cache = { enabled: false, message: '', at: 0 };
const TTL_MS = 10_000;

async function getMaintenanceState() {
  const now = Date.now();
  if (now - cache.at < TTL_MS) return cache;

  const [enabledSetting, messageSetting] = await Promise.all([
    Settings.findOne({ key: 'maintenance_enabled' }),
    Settings.findOne({ key: 'maintenance_message' }),
  ]);

  cache = {
    enabled: enabledSetting?.value === true || enabledSetting?.value === 'true',
    message:
      String(messageSetting?.value || 'We are under maintenance. Please check back soon.').trim(),
    at: now,
  };
  return cache;
}

export const maintenanceGate = (options = {}) => {
  const allowPaths = options.allowPaths || [];
  const allowMethods = options.allowMethods || ['GET', 'HEAD', 'OPTIONS'];

  return async (req, _res, next) => {
    try {
      const state = await getMaintenanceState();
      if (!state.enabled) return next();

      if (allowMethods.includes(req.method)) {
        const path = req.path || '';
        if (allowPaths.some((p) => path.startsWith(p))) return next();
      }

      return next(new ApiError(503, state.message));
    } catch {
      // If settings are unavailable, do not block traffic.
      return next();
    }
  };
};

