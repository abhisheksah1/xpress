import { Outlet, Link } from 'react-router-dom';
import { useCartStore } from '../store/cartStore';

export default function StoreLayout() {
  const count = useCartStore((s) => s.count());

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="text-2xl font-bold text-primary-600">
              KoseliXpress
            </Link>
            <nav className="hidden md:flex items-center gap-6">
              <Link to="/shop" className="text-gray-600 hover:text-primary-600">Shop</Link>
              <Link to="/blog" className="text-gray-600 hover:text-primary-600">Blog</Link>
              <Link to="/orders" className="text-gray-600 hover:text-primary-600">My Orders</Link>
            </nav>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-sm text-gray-600 hover:text-primary-600">Login</Link>
              <Link to="/cart" className="relative btn-primary text-sm">
                Cart
                {count > 0 && (
                  <span className="absolute -top-2 -right-2 bg-primary-800 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                    {count}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-gray-900 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-lg font-semibold text-white mb-2">KoseliXpress</p>
          <p className="text-sm">Gifts delivered across Nepal</p>
          <p className="text-xs mt-4 text-gray-500">&copy; {new Date().getFullYear()} KoseliXpress. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
