import { ROLES } from '../config/constants.js';
import { ApiError } from '../utils/ApiError.js';

export const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, 'Authentication required'));
  if (!roles.includes(req.user.role)) {
    return next(new ApiError(403, 'Insufficient permissions'));
  }
  next();
};

export const isAdmin = authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN);
export const isSuperAdmin = authorize(ROLES.SUPER_ADMIN);
export const isStaff = authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.STAFF);

export const hasPermission = (...permissions) => (req, res, next) => {
  if (!req.user) return next(new ApiError(401, 'Authentication required'));
  if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(req.user.role)) return next();

  const hasAll = permissions.every((p) => req.user.permissions?.includes(p));
  if (!hasAll) return next(new ApiError(403, 'Missing required permission'));
  next();
};
