import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { registerSchema, loginSchema } from '../validators/index.js';
import config from '../config/index.js';

const router = Router();

const authAttemptLimiter = config.rateLimit.enabled
  ? rateLimit({
      windowMs: config.rateLimit.windowMs,
      max: config.rateLimit.authMax,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, message: 'Too many login attempts, please try again later' },
    })
  : (req, res, next) => next();

router.post('/register', authAttemptLimiter, validate(registerSchema), authController.register);
router.post('/login', authAttemptLimiter, validate(loginSchema), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.getProfile);
router.patch('/me', authenticate, authController.updateProfile);
router.post('/change-password', authenticate, authController.changePassword);

export default router;
