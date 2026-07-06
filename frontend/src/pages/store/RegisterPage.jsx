import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../api/client.js';
import { useAuthStore } from '../../store/authStore.js';
import { useStore } from '../../context/StoreContext.jsx';
import {
  COUNTRY_CODES,
  DEFAULT_COUNTRY_CODE,
  validatePhoneForCountry,
  phoneMaxLength,
} from '../../utils/countryCodes.js';

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { settings } = useStore();
  const setUser = useAuthStore((s) => s.setUser);
  const [form, setForm] = useState({
    name: '',
    email: '',
    countryCode: DEFAULT_COUNTRY_CODE,
    phone: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

  if (settings.registration_enabled === false) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <div className="card">
          <h1 className="text-xl font-bold mb-2">Registration Closed</h1>
          <p className="text-gray-500 text-sm mb-4">New customer registration is currently disabled.</p>
          <Link to="/login" className="text-primary-600 hover:underline text-sm">Sign in instead</Link>
        </div>
      </div>
    );
  }

  const minLen = Number(settings.min_password_length) || 8;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < minLen) {
      return toast.error(`Password must be at least ${minLen} characters`);
    }
    const phoneErr = validatePhoneForCountry(form.phone, form.countryCode);
    if (phoneErr) return toast.error(phoneErr);

    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', form);
      localStorage.setItem('accessToken', data.data.accessToken);
      if (data.data.user) setUser(data.data.user);
      toast.success('Account created');
      navigate(location.state?.from || '/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card">
        <h1 className="text-2xl font-bold mb-6 text-center">Create Account</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input type="text" className="input-field" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input type="email" className="input-field" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contact number</label>
            <div className="flex gap-2">
              <select
                className="input-field w-40 shrink-0 text-sm"
                value={form.countryCode}
                onChange={(e) => setForm((f) => ({ ...f, countryCode: e.target.value, phone: '' }))}
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={`${c.code}-${c.country}`} value={c.code}>{c.label}</option>
                ))}
              </select>
              <input
                type="tel"
                className="input-field flex-1"
                required
                placeholder={form.countryCode === DEFAULT_COUNTRY_CODE ? '98XXXXXXXX' : 'Contact number'}
                maxLength={phoneMaxLength(form.countryCode)}
                value={form.phone}
                onChange={(e) => setForm((f) => ({
                  ...f,
                  phone: e.target.value.replace(/\D/g, '').slice(0, phoneMaxLength(f.countryCode)),
                }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password (min {minLen} chars)</label>
            <input type="password" className="input-field" required minLength={minLen} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Creating...' : 'Register'}</button>
        </form>
        <p className="text-sm text-center mt-4 text-gray-500">
          Already have an account? <Link to="/login" className="text-primary-600 hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
}
