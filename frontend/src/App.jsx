import { Routes, Route } from 'react-router-dom';
import StoreLayout from './layouts/StoreLayout';
import AdminLayout from './layouts/AdminLayout';
import HomePage from './pages/store/HomePage';
import ShopPage from './pages/store/ShopPage';
import LoginPage from './pages/store/LoginPage';
import RegisterPage from './pages/store/RegisterPage';
import CartPage from './pages/store/CartPage';
import CheckoutPage from './pages/store/CheckoutPage';
import OrderHistoryPage from './pages/store/OrderHistoryPage';
import BlogPage from './pages/store/BlogPage';
import AdminDashboard from './pages/admin/DashboardPage';
import AdminProducts from './pages/admin/ProductsPage';
import AdminOrders from './pages/admin/OrdersPage';
import AdminSettings from './pages/admin/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<StoreLayout />}>
        <Route index element={<HomePage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="orders" element={<OrderHistoryPage />} />
        <Route path="blog" element={<BlogPage />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>
    </Routes>
  );
}
