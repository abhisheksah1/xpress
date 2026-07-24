import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { storeApi } from '../../api/store.js';
import { useAuthStore } from '../../store/authStore.js';

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

const statusClass = (status) => {
  const map = {
    pending: 'bg-amber-100 text-amber-800',
    confirmed: 'bg-blue-100 text-blue-800',
    processing: 'bg-indigo-100 text-indigo-800',
    shipped: 'bg-violet-100 text-violet-800',
    out_for_delivery: 'bg-purple-100 text-purple-800',
    delivered: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
    refunded: 'bg-slate-100 text-slate-700',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
};

function GuestTrackForm() {
  const navigate = useNavigate();
  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');

  const track = (e) => {
    e.preventDefault();
    if (!orderNumber.trim() || !email.trim()) {
      toast.error('Order number and email are required');
      return;
    }
    const params = new URLSearchParams({
      orderNumber: orderNumber.trim(),
      email: email.trim(),
    });
    navigate(`/track?${params.toString()}`);
  };

  return (
    <div className="card">
      <h2 className="font-semibold mb-2">Track a guest order</h2>
      <p className="text-sm text-gray-500 mb-4">
        Placed an order without logging in? Enter your order number and checkout email.
      </p>
      <form onSubmit={track} className="flex flex-col sm:flex-row gap-3">
        <input
          className="input-field"
          placeholder="Order number (e.g. KO-...)"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          required
        />
        <input
          className="input-field"
          type="email"
          placeholder="Email used at checkout"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" className="btn-primary whitespace-nowrap">Track</button>
      </form>
    </div>
  );
}

export default function OrderHistoryPage() {
  const user = useAuthStore((s) => s.user);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setLoading(true);
    storeApi
      .getMyOrders({ limit: 50 })
      .then(({ data }) => {
        if (!cancelled) setOrders(data.data?.orders || []);
      })
      .catch((err) => {
        if (!cancelled) toast.error(err.response?.data?.message || 'Could not load orders');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">My Orders</h1>
        <p className="text-gray-500 mb-6">
          Sign in to see all orders linked to your email — including orders you placed as a guest.
        </p>
        <div className="card mb-8 text-center py-8">
          <p className="text-gray-600 mb-4">Log in with the same email you used at checkout.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/login" state={{ from: '/orders' }} className="btn-primary">
              Login
            </Link>
            <Link to="/register" state={{ from: '/orders' }} className="btn-secondary">
              Create account
            </Link>
          </div>
        </div>
        <GuestTrackForm />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">My Orders</h1>
      <p className="text-sm text-gray-500 mb-6">
        Showing orders for <span className="font-medium text-gray-700">{user.email}</span>
        {' '}— including guest orders placed with this email.
      </p>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading your orders...</p>
      ) : orders.length === 0 ? (
        <div className="card text-center py-10">
          <p className="text-gray-600 mb-4">You have no orders yet.</p>
          <Link to="/shop" className="btn-primary">Start shopping</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const trackUrl = `/track?orderNumber=${encodeURIComponent(order.orderNumber)}&email=${encodeURIComponent(user.email)}`;
            const status = order.status || 'pending';
            const paymentStatus = order.payment?.status;
            const total = Number(order.total || 0).toLocaleString('en-NP');
            const date = order.createdAt
              ? new Date(order.createdAt).toLocaleDateString('en-NP', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })
              : '';

            return (
              <Link
                key={order._id}
                to={trackUrl}
                className="card block hover:border-primary-200 hover:shadow-sm transition-all"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{date}</p>
                    {order.items?.length > 0 && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                        {order.items.map((i) => `${i.name} × ${i.quantity}`).join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold text-primary-600 tabular-nums">Rs. {total}</p>
                    <div className="flex flex-wrap justify-end gap-1.5 mt-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusClass(status)}`}>
                        {STATUS_LABELS[status] || status}
                      </span>
                      {paymentStatus && paymentStatus !== 'paid' && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          Payment: {paymentStatus}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <GuestTrackForm />
      </div>
    </div>
  );
}
