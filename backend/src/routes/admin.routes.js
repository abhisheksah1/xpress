import { Router } from 'express';
import * as productController from '../controllers/admin/product.controller.js';
import * as inventoryController from '../controllers/admin/inventory.controller.js';
import * as orderController from '../controllers/admin/order.controller.js';
import * as userController from '../controllers/admin/user.controller.js';
import * as staffController from '../controllers/admin/staff.controller.js';
import * as blogController from '../controllers/admin/blog.controller.js';
import * as cmsController from '../controllers/admin/cms.controller.js';
import * as navbarController from '../controllers/admin/navbar.controller.js';
import * as settingsController from '../controllers/admin/settings.controller.js';
import * as uploadController from '../controllers/admin/upload.controller.js';
import * as dashboardController from '../controllers/admin/dashboard.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { isStaff, isAdmin, isSuperAdmin, hasPermission } from '../middlewares/role.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { uploadSingle } from '../middlewares/upload.middleware.js';
import {
  createProductSchema,
  bulkPriceSchema,
  createStaffSchema,
  createBlogSchema,
  updateSettingsSchema,
} from '../validators/index.js';

const router = Router();

router.use(authenticate, isStaff);

// Dashboard
router.get('/dashboard', dashboardController.getDashboard);

// Products
router.get('/products/stats', hasPermission('products:read'), productController.getCatalogStats);
router.get('/products/export', hasPermission('products:read'), productController.exportProducts);
router.post('/products/import', hasPermission('products:write'), productController.importProducts);
router.get('/products', hasPermission('products:read'), productController.getProducts);
router.post('/products', hasPermission('products:write'), validate(createProductSchema), productController.createProduct);
router.post('/products/:id/clone', hasPermission('products:write'), productController.cloneProduct);
router.get('/products/:id', hasPermission('products:read'), productController.getProduct);
router.patch('/products/:id', hasPermission('products:write'), productController.updateProduct);
router.delete('/products/:id', hasPermission('products:write'), productController.deleteProduct);
router.patch('/products/bulk/prices', hasPermission('products:write'), validate(bulkPriceSchema), productController.bulkUpdatePrices);

// Categories
router.get('/categories', productController.getCategories);
router.post('/categories', hasPermission('products:write'), productController.createCategory);
router.patch('/categories/:id', hasPermission('products:write'), productController.updateCategory);
router.delete('/categories/:id', hasPermission('products:write'), productController.deleteCategory);

// Inventory
router.get('/inventory/logs', hasPermission('inventory:read'), inventoryController.getLogs);
router.get('/inventory/low-stock', hasPermission('inventory:read'), inventoryController.getLowStock);
router.post('/inventory/adjust', hasPermission('inventory:write'), inventoryController.adjustStock);

// Orders
router.get('/orders', hasPermission('orders:read'), orderController.getOrders);
router.get('/orders/:id', hasPermission('orders:read'), orderController.getOrder);
router.patch('/orders/:id/status', hasPermission('orders:write'), orderController.updateStatus);

// Delivery Zones
router.get('/delivery-zones', orderController.getDeliveryZones);
router.post('/delivery-zones', isAdmin, orderController.createDeliveryZone);
router.patch('/delivery-zones/:id', isAdmin, orderController.updateDeliveryZone);
router.delete('/delivery-zones/:id', isAdmin, orderController.deleteDeliveryZone);

// Users
router.get('/users', hasPermission('users:read'), userController.getUsers);
router.get('/users/:id', hasPermission('users:read'), userController.getUser);
router.patch('/users/:id', hasPermission('users:read'), userController.updateUser);
router.patch('/users/:id/toggle-status', isAdmin, userController.toggleStatus);
router.delete('/users/:id', isAdmin, userController.deleteUser);

// Staff
router.get('/staff', isAdmin, staffController.getStaff);
router.post('/staff', isAdmin, validate(createStaffSchema), staffController.createStaff);
router.patch('/staff/:id', isAdmin, staffController.updateStaff);
router.delete('/staff/:id', isSuperAdmin, staffController.deleteStaff);

// Blog
router.get('/blogs', hasPermission('blog:read'), blogController.getBlogs);
router.post('/blogs', hasPermission('blog:write'), validate(createBlogSchema), blogController.createBlog);
router.get('/blogs/:id', hasPermission('blog:read'), blogController.getBlog);
router.patch('/blogs/:id', hasPermission('blog:write'), blogController.updateBlog);
router.delete('/blogs/:id', hasPermission('blog:write'), blogController.deleteBlog);

// CMS
router.get('/cms', hasPermission('cms:read'), cmsController.getPages);
router.post('/cms', hasPermission('cms:write'), cmsController.createPage);
router.get('/cms/:id', hasPermission('cms:read'), cmsController.getPage);
router.patch('/cms/:id', hasPermission('cms:write'), cmsController.updatePage);
router.patch('/cms/:id/blocks', hasPermission('cms:write'), cmsController.updateBlocks);
router.delete('/cms/:id', hasPermission('cms:write'), cmsController.deletePage);

// Navbar
router.get('/navbars', navbarController.getNavbars);
router.post('/navbars', isAdmin, navbarController.createNavbar);
router.get('/navbars/:id', navbarController.getNavbar);
router.patch('/navbars/:id', isAdmin, navbarController.updateNavbar);
router.patch('/navbars/:id/items', isAdmin, navbarController.updateNavItems);
router.delete('/navbars/:id', isAdmin, navbarController.deleteNavbar);

// Settings
router.get('/settings', hasPermission('settings:read'), settingsController.getSettings);
router.post('/settings', isAdmin, settingsController.createSetting);
router.patch('/settings/bulk', isAdmin, validate(updateSettingsSchema), settingsController.bulkUpdate);
router.patch('/settings/:key', isAdmin, settingsController.updateSetting);
router.post('/settings/test-smtp', isAdmin, settingsController.testSmtp);

// Upload
router.post('/upload', uploadSingle('image'), uploadController.uploadImage);
router.delete('/upload', uploadController.deleteImage);

export default router;
