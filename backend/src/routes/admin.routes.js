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
import { uploadSingle, uploadMultiple } from '../middlewares/upload.middleware.js';
import * as deliveryController from '../controllers/admin/delivery.controller.js';
import * as couponController from '../controllers/admin/coupon.controller.js';
import * as reminderController from '../controllers/admin/reminder.controller.js';
import * as apiPartnerController from '../controllers/admin/apiPartner.controller.js';
import * as apiPartnerReportController from '../controllers/admin/apiPartnerReport.controller.js';
import * as financeController from '../controllers/admin/finance.controller.js';
import {
  createProductSchema,
  createCategorySchema,
  updateCategorySchema,
  bulkPriceSchema,
  createStaffSchema,
  createBlogSchema,
  updateBlogSchema,
  deliveryGroupSchema,
  deliveryLocationSchema,
  updateSettingsSchema,
  createCouponSchema,
  updateCouponSchema,
  updateOrderStatusSchema,
  updateOrderPaymentSchema,
  confirmLeadOrderSchema,
  cancelLeadOrderSchema,
  createCmsPageSchema,
  updateCmsPageSchema,
  cloneCmsPageSchema,
  fetchGoogleReviewsSchema,
  createApiPartnerSchema,
  updateApiPartnerSchema,
  createVendorSchema,
  updateVendorSchema,
  createPurchaseSchema,
  createExpenseSchema,
  createTreasuryAccountSchema,
  createTreasuryTransactionSchema,
  adjustTreasuryBalanceSchema,
} from '../validators/index.js';

const router = Router();

router.use(authenticate, isStaff);

// Dashboard
router.get('/dashboard', dashboardController.getDashboard);

// Products
router.get('/products/stats', hasPermission('products:read'), productController.getCatalogStats);
router.get('/products/export', hasPermission('products:read'), productController.exportProducts);
router.get('/products/import/template', hasPermission('products:read'), productController.importCsvTemplate);
router.post('/products/import', hasPermission('products:write'), productController.importProducts);
router.post('/products/bulk/delete', hasPermission('products:write'), productController.bulkDeleteProducts);
router.patch('/products/bulk/prices', hasPermission('products:write'), validate(bulkPriceSchema), productController.bulkUpdatePrices);
router.get('/products', hasPermission('products:read'), productController.getProducts);
router.post('/products', hasPermission('products:write'), validate(createProductSchema), productController.createProduct);
router.post('/products/:id/clone', hasPermission('products:write'), productController.cloneProduct);
router.get('/products/:id', hasPermission('products:read'), productController.getProduct);
router.patch('/products/:id', hasPermission('products:write'), productController.updateProduct);
router.delete('/products/:id', hasPermission('products:write'), productController.deleteProduct);

// Categories
router.get('/categories', productController.getCategories);
router.post('/categories', hasPermission('products:write'), validate(createCategorySchema), productController.createCategory);
router.patch('/categories/:id', hasPermission('products:write'), validate(updateCategorySchema), productController.updateCategory);
router.delete('/categories/:id', hasPermission('products:write'), productController.deleteCategory);

// Inventory
router.get('/inventory/logs', hasPermission('inventory:read'), inventoryController.getLogs);
router.get('/inventory/low-stock', hasPermission('inventory:read'), inventoryController.getLowStock);
router.post('/inventory/adjust', hasPermission('inventory:write'), inventoryController.adjustStock);

// Orders
router.get('/orders/leads/count', hasPermission('orders:read'), orderController.getLeadOrderCount);
router.get('/orders', hasPermission('orders:read'), orderController.getOrders);
router.get('/orders/export/csv', hasPermission('orders:read'), orderController.exportOrdersCsv);
router.get('/orders/:id', hasPermission('orders:read'), orderController.getOrder);
router.post('/orders/:id/confirm', hasPermission('orders:write'), validate(confirmLeadOrderSchema), orderController.confirmLead);
router.post('/orders/:id/cancel-lead', hasPermission('orders:write'), validate(cancelLeadOrderSchema), orderController.cancelLead);
router.patch('/orders/:id/status', hasPermission('orders:write'), validate(updateOrderStatusSchema), orderController.updateStatus);
router.patch('/orders/:id/payment', hasPermission('orders:write'), validate(updateOrderPaymentSchema), orderController.updatePayment);

// Coupons
router.get('/coupons', isAdmin, couponController.getCoupons);
router.get('/coupons/report', isAdmin, couponController.getCouponUsageReport);
router.post('/coupons', isAdmin, validate(createCouponSchema), couponController.createCoupon);
router.get('/coupons/:id', isAdmin, couponController.getCoupon);
router.patch('/coupons/:id', isAdmin, validate(updateCouponSchema), couponController.updateCoupon);
router.delete('/coupons/:id', isAdmin, couponController.deleteCoupon);

// Reminders
router.get('/reminders', hasPermission('reminders:read'), reminderController.getReminders);
router.post('/reminders/:id/send', hasPermission('reminders:write'), reminderController.sendReminder);
router.post('/reminders/:id/whatsapp', hasPermission('reminders:write'), reminderController.whatsAppReminder);

// Delivery Locations
router.get('/delivery-locations', deliveryController.getDeliveryLocations);
router.post('/delivery-locations', isAdmin, validate(deliveryLocationSchema), deliveryController.createDeliveryLocation);
router.patch('/delivery-locations/:id', isAdmin, validate(deliveryLocationSchema), deliveryController.updateDeliveryLocation);
router.delete('/delivery-locations/:id', isAdmin, deliveryController.deleteDeliveryLocation);

// Delivery Groups
router.get('/delivery-groups', deliveryController.getDeliveryGroups);
router.get('/delivery-groups/:id', deliveryController.getDeliveryGroup);
router.get('/delivery-groups/:id/products', deliveryController.getGroupProducts);
router.post('/delivery-groups', isAdmin, validate(deliveryGroupSchema), deliveryController.createDeliveryGroup);
router.patch('/delivery-groups/:id', isAdmin, validate(deliveryGroupSchema), deliveryController.updateDeliveryGroup);
router.delete('/delivery-groups/:id', isAdmin, deliveryController.deleteDeliveryGroup);

// Legacy delivery zone routes (alias to groups)
router.get('/delivery-zones', deliveryController.getDeliveryZones);
router.post('/delivery-zones', isAdmin, validate(deliveryGroupSchema), deliveryController.createDeliveryZone);
router.patch('/delivery-zones/:id', isAdmin, validate(deliveryGroupSchema), deliveryController.updateDeliveryZone);
router.delete('/delivery-zones/:id', isAdmin, deliveryController.deleteDeliveryZone);

// Users
router.get('/users', hasPermission('users:read'), userController.getUsers);
router.get('/users/:id', hasPermission('users:read'), userController.getUser);
router.patch('/users/:id', hasPermission('users:write'), userController.updateUser);
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
router.patch('/blogs/:id', hasPermission('blog:write'), validate(updateBlogSchema), blogController.updateBlog);
router.delete('/blogs/:id', hasPermission('blog:write'), blogController.deleteBlog);

// CMS
router.get('/cms', hasPermission('cms:read'), cmsController.getPages);
router.post('/cms/setup-home', hasPermission('cms:write'), cmsController.setupHomePage);
router.post('/cms/google-reviews/fetch', hasPermission('cms:write'), validate(fetchGoogleReviewsSchema), cmsController.fetchGoogleReviews);
router.post('/cms', hasPermission('cms:write'), validate(createCmsPageSchema), cmsController.createPage);
router.get('/cms/:id', hasPermission('cms:read'), cmsController.getPage);
router.post('/cms/:id/clone', hasPermission('cms:write'), validate(cloneCmsPageSchema), cmsController.clonePage);
router.patch('/cms/:id', hasPermission('cms:write'), validate(updateCmsPageSchema), cmsController.updatePage);
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
router.post('/settings/sync-nrb-rates', isAdmin, settingsController.syncNrbRates);

// Upload
router.post('/upload', uploadSingle('image'), uploadController.uploadImage);
router.post('/upload/batch', uploadMultiple('images', 20), uploadController.uploadImages);
router.delete('/upload', uploadController.deleteImage);

// API Gateway Partners
router.get('/api-partners/reports/explorer', isAdmin, apiPartnerReportController.getExplorerReport);
router.get('/api-partners/reports/export', isAdmin, apiPartnerReportController.exportReportCsv);
router.get('/api-partners', isAdmin, apiPartnerController.listPartners);
router.post('/api-partners', isAdmin, validate(createApiPartnerSchema), apiPartnerController.createPartner);
router.get('/api-partners/:id', isAdmin, apiPartnerController.getPartner);
router.patch('/api-partners/:id', isAdmin, validate(updateApiPartnerSchema), apiPartnerController.updatePartner);
router.delete('/api-partners/:id', isAdmin, apiPartnerController.deletePartner);
router.post('/api-partners/:id/reset-credentials', isAdmin, apiPartnerController.resetCredentials);
router.get('/api-partners/:id/logs', isAdmin, apiPartnerController.getLogs);
router.get('/api-partners/:id/documentation', isAdmin, apiPartnerController.downloadDocumentation);
router.get('/api-partners/:id/documentation/preview', isAdmin, apiPartnerController.previewDocumentation);

// Finance & accounting
router.get('/finance/pnl', isAdmin, financeController.getProfitAndLoss);
router.get('/finance/pnl/export', isAdmin, financeController.exportPnlCsv);
router.get('/finance/stock', isAdmin, financeController.getStockReport);
router.get('/finance/stock/export', isAdmin, financeController.exportStockReportCsv);
router.get('/finance/vendors', isAdmin, financeController.listVendors);
router.get('/finance/vendors/export', isAdmin, financeController.exportVendorsCsv);
router.post('/finance/vendors', isAdmin, validate(createVendorSchema), financeController.createVendor);
router.get('/finance/vendors/:id', isAdmin, financeController.getVendor);
router.patch('/finance/vendors/:id', isAdmin, validate(updateVendorSchema), financeController.updateVendor);
router.delete('/finance/vendors/:id', isAdmin, financeController.deleteVendor);
router.get('/finance/purchases', isAdmin, financeController.listPurchases);
router.get('/finance/purchases/report', isAdmin, financeController.getPurchaseReport);
router.get('/finance/purchases/report/export', isAdmin, financeController.exportPurchaseReportCsv);
router.post('/finance/purchases', isAdmin, validate(createPurchaseSchema), financeController.createPurchase);
router.get('/finance/purchases/:id', isAdmin, financeController.getPurchase);
router.delete('/finance/purchases/:id', isAdmin, financeController.deletePurchase);
router.get('/finance/expenses', isAdmin, financeController.listExpenses);
router.get('/finance/expenses/export', isAdmin, financeController.exportExpensesCsv);
router.post('/finance/expenses', isAdmin, validate(createExpenseSchema), financeController.createExpense);
router.patch('/finance/expenses/:id', isAdmin, financeController.updateExpense);
router.delete('/finance/expenses/:id', isAdmin, financeController.deleteExpense);
router.get('/finance/treasury/accounts', isAdmin, financeController.listTreasuryAccounts);
router.post('/finance/treasury/accounts', isAdmin, validate(createTreasuryAccountSchema), financeController.createTreasuryAccount);
router.patch('/finance/treasury/accounts/:id', isAdmin, financeController.updateTreasuryAccount);
router.post(
  '/finance/treasury/accounts/:id/adjust-balance',
  isAdmin,
  validate(adjustTreasuryBalanceSchema),
  financeController.adjustTreasuryBalance
);
router.get('/finance/treasury/transactions', isAdmin, financeController.listTreasuryTransactions);
router.get('/finance/treasury/transactions/export', isAdmin, financeController.exportTreasuryReportCsv);
router.post('/finance/treasury/transactions', isAdmin, validate(createTreasuryTransactionSchema), financeController.createTreasuryTransaction);

export default router;
