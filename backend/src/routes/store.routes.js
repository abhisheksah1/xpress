import { Router } from 'express';
import * as productController from '../controllers/store/product.controller.js';
import * as orderController from '../controllers/store/order.controller.js';
import * as blogController from '../controllers/store/blog.controller.js';
import * as cmsController from '../controllers/store/cms.controller.js';
import * as settingsController from '../controllers/store/settings.controller.js';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createOrderSchema } from '../validators/index.js';

const router = Router();

// Storefront config
router.get('/settings', settingsController.getSettings);
router.get('/navbar', settingsController.getNavbars);

// Products
router.get('/products', productController.getProducts);
router.get('/products/:slug', productController.getProduct);
router.get('/categories', productController.getCategories);

// Orders & Checkout
router.get('/delivery-zones', orderController.getDeliveryZones);
router.post('/orders', optionalAuth, validate(createOrderSchema), orderController.createOrder);
router.post('/orders/verify-payment', orderController.verifyPayment);
router.get('/orders/track', orderController.trackOrder);
router.get('/orders/my', authenticate, orderController.getMyOrders);
router.get('/orders/my/:id', authenticate, orderController.getMyOrder);

// Blog
router.get('/blogs', blogController.getBlogs);
router.get('/blogs/:slug', blogController.getBlog);

// CMS Pages
router.get('/pages', cmsController.getPages);
router.get('/pages/:slug', cmsController.getPage);

export default router;
