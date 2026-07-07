import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminLogin = location.pathname === '/admin/login';
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      const staffRoles = ['super_admin', 'admin', 'staff'];
      if (isAdminLogin && !staffRoles.includes(user.role)) {
        toast.error('This login is for admin staff only');
        return;
      }
      const defaultRedirect = isAdminLogin || staffRoles.includes(user.role) ? '/admin' : '/';
      const redirect = location.state?.from || defaultRedirect;
      toast.success('Logged in successfully');
      navigate(redirect);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`max-w-md mx-auto px-4 py-16${isAdminLogin ? ' min-h-screen flex items-center' : ''}`}>
      <div className="card w-full">
        <h1 className="text-2xl font-bold mb-2 text-center">{isAdminLogin ? 'Admin Login' : 'Login'}</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          {isAdminLogin
            ? 'Sign in to access the admin panel'
            : 'Sign in to access your account'}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              className="input-field"
              placeholder="admin@koselixpress.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
        {!isAdminLogin && (
          <p className="text-sm text-center mt-4 text-gray-500">
            No account? <Link to="/register" className="text-primary-600 hover:underline">Register</Link>
          </p>
        )}
      </div>
    </div>
  );
}
