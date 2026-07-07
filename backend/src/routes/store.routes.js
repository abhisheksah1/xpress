import { Router } from 'express';
import * as productController from '../controllers/store/product.controller.js';
import * as orderController from '../controllers/store/order.controller.js';
import * as couponController from '../controllers/store/coupon.controller.js';
import * as blogController from '../controllers/store/blog.controller.js';
import * as cmsController from '../controllers/store/cms.controller.js';
import * as settingsController from '../controllers/store/settings.controller.js';
import * as storeUploadController from '../controllers/store/upload.controller.js';
import * as reminderController from '../controllers/store/reminder.controller.js';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware.js';
import { authorize } from '../middlewares/role.middleware.js';
import { ROLES } from '../config/constants.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createOrderSchema, validateCouponSchema, createReminderSchema, updateReminderSchema, verifyPaymentSchema } from '../validators/index.js';
import { maintenanceGate } from '../middlewares/maintenance.middleware.js';
import { uploadSingle } from '../middlewares/upload.middleware.js';

const router = Router();

// Maintenance mode: allow browsing, block checkout/actions
router.use(
  maintenanceGate({
    allowPaths: ['/settings', '/navbar', '/pages', '/products', '/categories', '/blogs', '/delivery-zones', '/delivery-locations', '/payment-gateways', '/upload/personalization', '/coupons'],
    allowMethods: ['GET', 'HEAD', 'OPTIONS'],
  })
);

// Storefront config
router.get('/settings', settingsController.getSettings);
router.get('/payment-gateways', settingsController.getPaymentGateways);
router.post('/upload/personalization', optionalAuth, uploadSingle('image'), storeUploadController.uploadPersonalizationImage);
router.get('/navbar', settingsController.getNavbars);

// Products
router.get('/products', productController.getProducts);
router.get('/products/:slug', productController.getProduct);
router.get('/categories', productController.getCategories);

// Orders & Checkout
router.get('/delivery-locations', orderController.getDeliveryLocations);
router.get('/delivery-zones', orderController.getDeliveryZones);
router.post('/coupons/validate', optionalAuth, validate(validateCouponSchema), couponController.validateCoupon);
router.post('/checkout/quote', optionalAuth, validate(validateCouponSchema), couponController.checkoutQuote);
router.post('/orders', optionalAuth, validate(createOrderSchema), orderController.createOrder);
router.post('/orders/verify-payment', validate(verifyPaymentSchema), orderController.verifyPayment);
router.get('/orders/track', orderController.trackOrder);
router.get('/orders/my', authenticate, orderController.getMyOrders);
router.get('/orders/my/:id', authenticate, orderController.getMyOrder);

// Reminders (registered customers only)
router.get('/reminders/my', authenticate, authorize(ROLES.CUSTOMER), reminderController.getMyReminders);
router.post('/reminders', authenticate, authorize(ROLES.CUSTOMER), validate(createReminderSchema), reminderController.createReminder);
router.patch('/reminders/:id', authenticate, authorize(ROLES.CUSTOMER), validate(updateReminderSchema), reminderController.updateReminder);
router.delete('/reminders/:id', authenticate, authorize(ROLES.CUSTOMER), reminderController.deleteReminder);

// Blog
router.get('/blogs', blogController.getBlogs);
router.get('/blogs/:slug', blogController.getBlog);

// CMS Pages
router.get('/pages', cmsController.getPages);
router.get('/pages/type/:pageType', cmsController.getPageByType);
router.get('/pages/:slug', cmsController.getPage);

export default router;
