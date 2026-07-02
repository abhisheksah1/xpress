import { Routes, Route } from 'react-router-dom';
import StoreLayout from './layouts/StoreLayout';
import AdminLayout from './layouts/AdminLayout';
import AdminGuard from './components/admin/AdminGuard';
import HomePage from './pages/store/HomePage';
import ShopPage from './pages/store/ShopPage';
import ProductDetailPage from './pages/store/ProductDetailPage';
import CmsPageView from './pages/store/CmsPageView';
import LoginPage from './pages/store/LoginPage';
import RegisterPage from './pages/store/RegisterPage';
import CartPage from './pages/store/CartPage';
import CheckoutPage from './pages/store/CheckoutPage';
import OrderHistoryPage from './pages/store/OrderHistoryPage';
import TrackOrderPage from './pages/store/TrackOrderPage';
import BlogPage from './pages/store/BlogPage';
import BlogPostPage from './pages/store/BlogPostPage';
import AdminDashboard from './pages/admin/DashboardPage';
import AdminProducts from './pages/admin/ProductsPage';
import ProductFormPage from './pages/admin/ProductFormPage';
import ContentPage from './pages/admin/ContentPage';
import NavbarPage from './pages/admin/NavbarPage';
import BlogAdminPage from './pages/admin/BlogAdminPage';
import AdminOrders from './pages/admin/OrdersPage';
import LeadOrdersPage from './pages/admin/LeadOrdersPage';
import AdminSettings from './pages/admin/SettingsPage';
import DeliveryGroupsPage from './pages/admin/DeliveryGroupsPage';
import CouponsPage from './pages/admin/CouponsPage';
import AdminRemindersPage from './pages/admin/RemindersPage';
import RemindersPage from './pages/store/RemindersPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StoreLayout />}>
        <Route index element={<HomePage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="shop/:slug" element={<ProductDetailPage />} />
        <Route path="about" element={<CmsPageView pageType="about" />} />
        <Route path="contact" element={<CmsPageView pageType="contact" />} />
        <Route path="p/:slug" element={<CmsPageView />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
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
            <AdminLayout />
          </AdminGuard>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/new" element={<ProductFormPage />} />
        <Route path="products/:id/edit" element={<ProductFormPage />} />
        <Route path="content" element={<ContentPage />} />
        <Route path="navbar" element={<NavbarPage />} />
        <Route path="blog" element={<BlogAdminPage />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="leads" element={<LeadOrdersPage />} />
        <Route path="coupons" element={<CouponsPage />} />
        <Route path="reminders" element={<AdminRemindersPage />} />
        <Route path="delivery" element={<DeliveryGroupsPage />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  );
}
