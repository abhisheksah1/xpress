import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import StoreLayout from './layouts/StoreLayout';
import AdminGuard from './components/admin/AdminGuard';
import HomePage from './pages/store/HomePage';
import ShopPage from './pages/store/ShopPage';
import ProductDetailPage from './pages/store/ProductDetailPage';
import CmsPageView from './pages/store/CmsPageView';
import LoginPage from './pages/store/LoginPage';
import RegisterPage from './pages/store/RegisterPage';
import CartPage from './pages/store/CartPage';
import CheckoutPage from './pages/store/CheckoutPage';
import PaymentCallbackPage from './pages/store/PaymentCallbackPage';
import PaymentSandboxPage from './pages/store/PaymentSandboxPage';
import OrderHistoryPage from './pages/store/OrderHistoryPage';
import TrackOrderPage from './pages/store/TrackOrderPage';
import BlogPage from './pages/store/BlogPage';
import BlogPostPage from './pages/store/BlogPostPage';
import RemindersPage from './pages/store/RemindersPage';

const AdminLayout = lazy(() => import('./layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/DashboardPage'));
const AdminProducts = lazy(() => import('./pages/admin/ProductsPage'));
const ProductFormPage = lazy(() => import('./pages/admin/ProductFormPage'));
const ContentPage = lazy(() => import('./pages/admin/ContentPage'));
const MediaLibraryPage = lazy(() => import('./pages/admin/MediaLibraryPage'));
const NavbarPage = lazy(() => import('./pages/admin/NavbarPage'));
const BlogAdminPage = lazy(() => import('./pages/admin/BlogAdminPage'));
const AdminOrders = lazy(() => import('./pages/admin/OrdersPage'));
const LeadOrdersPage = lazy(() => import('./pages/admin/LeadOrdersPage'));
const AdminSettings = lazy(() => import('./pages/admin/SettingsPage'));
const DeliveryGroupsPage = lazy(() => import('./pages/admin/DeliveryGroupsPage'));
const CouponsPage = lazy(() => import('./pages/admin/CouponsPage'));
const AdminRemindersPage = lazy(() => import('./pages/admin/RemindersPage'));
const CustomersPage = lazy(() => import('./pages/admin/CustomersPage'));
const ApiPartnersPage = lazy(() => import('./pages/admin/ApiPartnersPage'));
const PartnerReportsPage = lazy(() => import('./pages/admin/PartnerReportsPage'));
const FinanceLayout = lazy(() => import('./layouts/FinanceLayout'));
const FinancePnlPage = lazy(() => import('./pages/admin/finance/FinancePnlPage'));
const FinanceSalesPage = lazy(() => import('./pages/admin/finance/FinanceSalesPage'));
const FinancePurchasesPage = lazy(() => import('./pages/admin/finance/FinancePurchasesPage'));
const FinanceExpensesPage = lazy(() => import('./pages/admin/finance/FinanceExpensesPage'));
const FinanceVendorsPage = lazy(() => import('./pages/admin/finance/FinanceVendorsPage'));
const FinanceStockPage = lazy(() => import('./pages/admin/finance/FinanceStockPage'));
const FinanceTreasuryPage = lazy(() => import('./pages/admin/finance/FinanceTreasuryPage'));
const StaffPage = lazy(() => import('./pages/admin/StaffPage'));

function AdminRouteFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-400">
      Loading admin…
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin/login" element={<LoginPage />} />

      <Route path="/" element={<StoreLayout />}>
        <Route index element={<HomePage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="shop/category/:categorySlug" element={<ShopPage />} />
        <Route path="shop/:slug" element={<ProductDetailPage />} />
        <Route path="about" element={<CmsPageView pageType="about" />} />
        <Route path="contact" element={<CmsPageView pageType="contact" />} />
        <Route path="p/:slug" element={<CmsPageView />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="checkout/sandbox/pay" element={<PaymentSandboxPage />} />
        <Route path="checkout/khalti/callback" element={<PaymentCallbackPage mode="khalti" />} />
        <Route path="checkout/esewa/success" element={<PaymentCallbackPage mode="esewa" />} />
        <Route path="checkout/esewa/failure" element={<PaymentCallbackPage mode="esewa-failure" />} />
        <Route path="checkout/fonepay/callback" element={<PaymentCallbackPage mode="fonepay" />} />
        <Route path="checkout/card/callback" element={<PaymentCallbackPage mode="card" />} />
        <Route path="checkout/imepay/callback" element={<PaymentCallbackPage mode="imepay" />} />
        <Route path="checkout/hbl/callback" element={<PaymentCallbackPage mode="hbl" />} />
        <Route path="orders" element={<OrderHistoryPage />} />
        <Route path="track" element={<TrackOrderPage />} />
        <Route path="reminders" element={<RemindersPage />} />
        <Route path="blog" element={<BlogPage />} />
        <Route path="blog/:slug" element={<BlogPostPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <AdminGuard>
            <Suspense fallback={<AdminRouteFallback />}>
              <AdminLayout />
            </Suspense>
          </AdminGuard>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/new" element={<ProductFormPage />} />
        <Route path="products/:id/edit" element={<ProductFormPage />} />
        <Route path="content" element={<ContentPage />} />
        <Route path="media" element={<MediaLibraryPage />} />
        <Route path="navbar" element={<NavbarPage />} />
        <Route path="blog" element={<BlogAdminPage />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="leads" element={<LeadOrdersPage />} />
        <Route path="coupons" element={<CouponsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="reminders" element={<AdminRemindersPage />} />
        <Route path="delivery" element={<DeliveryGroupsPage />} />
        <Route path="api-partners" element={<ApiPartnersPage />} />
        <Route path="api-partners/reports" element={<PartnerReportsPage />} />
        <Route path="finance" element={<FinanceLayout />}>
          <Route index element={<FinancePnlPage />} />
          <Route path="pnl" element={<FinancePnlPage />} />
          <Route path="sales" element={<FinanceSalesPage />} />
          <Route path="purchases" element={<FinancePurchasesPage />} />
          <Route path="expenses" element={<FinanceExpensesPage />} />
          <Route path="vendors" element={<FinanceVendorsPage />} />
          <Route path="stock" element={<FinanceStockPage />} />
          <Route path="treasury" element={<FinanceTreasuryPage />} />
        </Route>
        <Route path="settings" element={<AdminSettings />} />
        <Route path="staff" element={<StaffPage />} />
      </Route>
    </Routes>
  );
}
