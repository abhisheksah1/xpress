import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.accessToken;

  if (!token) return next(new ApiError(401, 'Authentication required'));

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) return next(new ApiError(401, 'Invalid or inactive user'));
    req.user = user;
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired token'));
  }
};

export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.accessToken;
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, config.jwt.accessSecret);
    const user = await User.findById(decoded.id);
    if (user?.isActive) req.user = user;
  } catch {
    // ignore invalid token for optional auth
  }
  next();
};
