import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore.js';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminLogin = location.pathname === '/admin/login';
  const login = useAuthStore((s) => s.login);
  const verifyAdminOtp = useAuthStore((s) => s.verifyAdminOtp);
  const resendAdminOtp = useAuthStore((s) => s.resendAdminOtp);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [trustDevice, setTrustDevice] = useState(true);
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const finishLogin = (user) => {
    const staffRoles = ['super_admin', 'admin', 'staff'];
    if (isAdminLogin && !staffRoles.includes(user.role)) {
      toast.error('This login is for admin staff only');
      return;
    }
    const defaultRedirect = isAdminLogin || staffRoles.includes(user.role) ? '/admin' : '/';
    const redirect = location.state?.from || defaultRedirect;
    toast.success('Logged in successfully');
    navigate(redirect);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(email, password, { trustDevice });
      if (result?.requiresOtp) {
        setChallenge(result);
        setOtp('');
        toast.success(`Verification code sent to ${result.emailHint}`);
        return;
      }
      finishLogin(result);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!challenge?.challengeId) return;
    setLoading(true);
    try {
      const user = await verifyAdminOtp({
        challengeId: challenge.challengeId,
        otp: otp.trim(),
        trustDevice,
      });
      setChallenge(null);
      finishLogin(user);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!challenge?.challengeId) return;
    setResending(true);
    try {
      const result = await resendAdminOtp(challenge.challengeId);
      setChallenge((prev) => ({ ...prev, ...result }));
      toast.success(`New code sent to ${result.emailHint}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resend code');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className={`max-w-md mx-auto px-4 py-16${isAdminLogin ? ' min-h-screen flex items-center' : ''}`}>
      <div className="card w-full">
        <h1 className="text-2xl font-bold mb-2 text-center">
          {challenge ? 'Verify your device' : isAdminLogin ? 'Admin Login' : 'Login'}
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          {challenge
            ? `Enter the 6-digit code sent to ${challenge.emailHint}`
            : isAdminLogin
              ? 'Sign in to access the admin panel'
              : 'Sign in to access your account'}
        </p>

        {challenge ? (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            {challenge.deviceLabel && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                New device detected: <strong>{challenge.deviceLabel}</strong>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Verification code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="input-field tracking-[0.35em] text-center text-lg font-semibold"
                placeholder="••••••"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={trustDevice}
                onChange={(e) => setTrustDevice(e.target.checked)}
              />
              Trust this device for future logins
            </label>
            <button type="submit" disabled={loading || otp.length !== 6} className="btn-primary w-full">
              {loading ? 'Verifying...' : 'Verify & continue'}
            </button>
            <div className="flex items-center justify-between gap-2 text-sm">
              <button
                type="button"
                className="text-primary-600 hover:underline disabled:opacity-50"
                disabled={resending}
                onClick={handleResend}
              >
                {resending ? 'Sending...' : 'Resend code'}
              </button>
              <button
                type="button"
                className="text-gray-500 hover:underline"
                onClick={() => {
                  setChallenge(null);
                  setOtp('');
                }}
              >
                Back to login
              </button>
            </div>
          </form>
        ) : (
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
            {isAdminLogin && (
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={trustDevice}
                  onChange={(e) => setTrustDevice(e.target.checked)}
                />
                Trust this device after verification
              </label>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>
        )}

        {!isAdminLogin && !challenge && (
          <p className="text-sm text-center mt-4 text-gray-500">
            No account? <Link to="/register" className="text-primary-600 hover:underline">Register</Link>
          </p>
        )}
      </div>
    </div>
  );
}
