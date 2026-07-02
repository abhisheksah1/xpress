import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { storeApi } from '../../api/store.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';

const STATUS_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];

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

const itemImageUrl = (item) => {
  if (item.image) return resolveMediaUrl(item.image);
  const imgs = item.product?.images || [];
  const primary = imgs.find((i) => i.isPrimary) || imgs[0];
  return primary?.url ? resolveMediaUrl(primary.url) : null;
};

function OrderImage({ src, alt, className = '' }) {
  if (!src) {
    return (
      <div className={`bg-gray-100 flex items-center justify-center text-gray-400 text-xs ${className}`}>
        No image
      </div>
    );
  }
  return (
    <a href={src} target="_blank" rel="noopener noreferrer" className={`block ${className}`}>
      <img src={src} alt={alt} className="w-full h-full object-contain bg-gray-50 rounded-lg border border-gray-100" />
    </a>
  );
}

export default function TrackOrderPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(searchParams.get('orderNumber') || '');
  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const fetchOrder = async (num, mail) => {
    if (!num.trim()) {
      toast.error('Enter your order number');
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await storeApi.trackOrder({
        orderNumber: num.trim(),
        email: mail.trim() || undefined,
      });
      setOrder(data.data);
      setSearchParams({
        orderNumber: num.trim(),
        ...(mail.trim() ? { email: mail.trim() } : {}),
      });
    } catch (err) {
      setOrder(null);
      toast.error(err.response?.data?.message || 'Order not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const num = searchParams.get('orderNumber');
    const mail = searchParams.get('email') || '';
    if (num) {
      setOrderNumber(num);
      setEmail(mail);
      fetchOrder(num, mail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    fetchOrder(orderNumber, email);
  };

  const currentStep = order ? STATUS_STEPS.indexOf(order.status) : -1;
  const isTerminal = order && ['cancelled', 'refunded'].includes(order.status);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Track your order</h1>
      <p className="text-gray-500 mb-6 text-sm">
        Enter your order number and the email used at checkout.{' '}
        <Link to="/orders" className="text-primary-600 hover:underline">View account orders</Link>
      </p>

      <form onSubmit={onSubmit} className="card mb-8 space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
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
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Looking up...' : 'Track order'}
        </button>
      </form>

      {loading && <p className="text-center text-gray-400 py-8">Loading order...</p>}

      {!loading && searched && !order && (
        <p className="text-center text-gray-500 py-8">No order found. Check the order number and email.</p>
      )}

      {order && (
        <div className="space-y-6">
          <div className="card">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <p className="text-xs font-bold uppercase text-gray-500">Order</p>
                <p className="font-mono font-bold text-lg">{order.orderNumber}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Placed {order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}
                </p>
              </div>
              <span className={`text-xs font-semibold uppercase px-3 py-1.5 rounded-full ${statusClass(order.status)}`}>
                {order.status?.replace(/_/g, ' ')}
              </span>
            </div>

            {!isTerminal && (
              <div className="flex flex-wrap gap-1 mb-4">
                {STATUS_STEPS.map((step, i) => {
                  const done = currentStep >= i;
                  const active = order.status === step;
                  return (
                    <div
                      key={step}
                      className={`text-[10px] uppercase font-semibold px-2 py-1 rounded-full ${
                        active ? 'bg-primary-600 text-white' : done ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {step.replace(/_/g, ' ')}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs font-bold uppercase text-gray-500 mb-1">Delivery</p>
                <p>{order.deliveryLocation?.name || order.shippingAddress?.district || '—'}</p>
                {order.receiver?.fullName && <p className="text-gray-600">To: {order.receiver.fullName}</p>}
                {order.timeSlot?.label && <p className="text-gray-600">{order.timeSlot.label}</p>}
                {order.preferredDeliveryDate && (
                  <p className="text-gray-600">
                    Preferred: {new Date(order.preferredDeliveryDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-gray-500 mb-1">Payment</p>
                <p className="capitalize">{order.payment?.method}</p>
                <p className="text-gray-600 capitalize">{order.payment?.status}</p>
                <p className="font-semibold mt-1">Rs. {Number(order.total || 0).toLocaleString('en-NP')}</p>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="font-semibold mb-3">Items</h2>
            <ul className="space-y-4">
              {(order.items || []).map((item) => {
                const img = itemImageUrl(item);
                const p = item.personalization || {};
                return (
                  <li key={item._id} className="flex gap-3 border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                    <OrderImage src={img} alt={item.name} className="w-20 h-20 shrink-0 rounded-lg overflow-hidden" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{item.name} × {item.quantity}</p>
                      <p className="text-sm text-gray-600">Rs. {(item.price * item.quantity).toLocaleString('en-NP')}</p>
                      {(p.cakeMessage || p.giftMessage) && (
                        <p className="text-xs text-gray-600 mt-1">
                          {p.cakeMessage && <>Message: {p.cakeMessage}</>}
                          {p.giftMessage && <>Gift note: {p.giftMessage}</>}
                        </p>
                      )}
                      {p.printImageUrl && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 mb-1">Custom print</p>
                          <OrderImage src={p.printImageUrl} alt="Print" className="w-24 h-24 rounded-lg overflow-hidden" />
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {(order.statusHistory || []).length > 0 && (
            <div className="card">
              <h2 className="font-semibold mb-3">Updates</h2>
              <ul className="space-y-2 text-sm">
                {order.statusHistory.slice().reverse().map((entry, i) => (
                  <li key={i} className="flex gap-3 text-gray-600">
                    <span className="text-gray-400 whitespace-nowrap text-xs">
                      {entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : ''}
                    </span>
                    <span>
                      <span className="font-medium capitalize text-gray-800">{entry.status?.replace(/_/g, ' ')}</span>
                      {entry.note && <> — {entry.note}</>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
