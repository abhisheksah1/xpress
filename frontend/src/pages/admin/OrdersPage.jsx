import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { adminApi } from '../../api/admin.js';
import { resolveMediaUrl } from '../../utils/mediaUrl.js';

const STATUS_OPTIONS = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'out_for_delivery',
  'delivered',
  'cancelled',
  'refunded',
];

const PAYMENT_STATUS_OPTIONS = ['pending', 'paid', 'failed', 'refunded'];

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
    paid: 'bg-emerald-100 text-emerald-800',
    failed: 'bg-red-100 text-red-800',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
};

const customerLabel = (order) => {
  if (order.user?.name) return order.user.name;
  if (order.sender?.fullName) return order.sender.fullName;
  return order.shippingAddress?.fullName || order.receiver?.fullName || '—';
};

const contactLabel = (order) => {
  const email = order.user?.email || order.guestEmail || order.sender?.email || order.shippingAddress?.email;
  const phone = order.user?.phone || order.guestPhone || order.receiver?.phone || order.shippingAddress?.phone;
  return { email: email || '—', phone: phone || '—' };
};

const itemImageUrl = (item) => {
  if (item.image) return resolveMediaUrl(item.image);
  const imgs = item.product?.images || [];
  const primary = imgs.find((i) => i.isPrimary) || imgs[0];
  return primary?.url ? resolveMediaUrl(primary.url) : null;
};

const buildTrackingUrl = (order) => {
  const email = order.trackingEmail || order.guestEmail || order.sender?.email || order.shippingAddress?.email || '';
  const params = new URLSearchParams({ orderNumber: order.orderNumber });
  if (email) params.set('email', email);
  return `${window.location.origin}/track?${params.toString()}`;
};

function OrderImage({ src, alt, size = 'md' }) {
  const sizes = { sm: 'w-16 h-16', md: 'w-24 h-24', lg: 'w-32 h-32' };
  const resolved = resolveMediaUrl(src);
  if (!resolved) {
    return (
      <div className={`${sizes[size]} bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 text-[10px] shrink-0`}>
        No image
      </div>
    );
  }
  return (
    <a
      href={resolved}
      target="_blank"
      rel="noopener noreferrer"
      className={`${sizes[size]} shrink-0 block rounded-lg overflow-hidden border border-gray-100 bg-gray-50`}
      title="Open full image"
    >
      <img src={resolved} alt={alt} className="w-full h-full object-contain" />
    </a>
  );
}

function OrderDetailModal({ orderId, open, onClose, onUpdated }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [leadNote, setLeadNote] = useState('');
  const [leadTxnId, setLeadTxnId] = useState('');
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [confirmingLead, setConfirmingLead] = useState(false);
  const [cancellingLead, setCancellingLead] = useState(false);

  const loadOrder = () => {
    if (!orderId) return;
    setLoading(true);
    return adminApi.getOrder(orderId)
      .then((res) => {
        const o = res.data.data;
        setOrder(o);
        setStatus(o.status);
        setPaymentStatus(o.payment?.status || 'pending');
        setTransactionId(o.payment?.transactionId || '');
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load order'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open || !orderId) return;
    loadOrder();
  }, [open, orderId]);

  if (!open) return null;

  const saveStatus = async () => {
    setSavingStatus(true);
    try {
      const { data } = await adminApi.updateOrderStatus(orderId, { status, note: statusNote.trim() || undefined });
      setOrder(data.data);
      setStatusNote('');
      toast.success('Order status updated');
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setSavingStatus(false);
    }
  };

  const savePayment = async () => {
    setSavingPayment(true);
    try {
      const { data } = await adminApi.updateOrderPayment(orderId, {
        status: paymentStatus,
        transactionId: transactionId.trim() || undefined,
        note: paymentNote.trim() || undefined,
      });
      setOrder(data.data);
      setPaymentNote('');
      toast.success('Payment status updated');
      onUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update payment');
    } finally {
      setSavingPayment(false);
    }
  };

  const copyTrackingUrl = async () => {
    if (!order) return;
    try {
      await navigator.clipboard.writeText(buildTrackingUrl(order));
      toast.success('Tracking link copied');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const confirmLead = async () => {
    setConfirmingLead(true);
    try {
      const { data } = await adminApi.confirmLeadOrder(orderId, {
        transactionId: leadTxnId.trim() || undefined,
        note: leadNote.trim() || undefined,
      });
      setOrder(data.data);
      setLeadNote('');
      toast.success('Lead converted to confirmed order');
      onUpdated(true);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to confirm lead');
    } finally {
      setConfirmingLead(false);
    }
  };

  const cancelLead = async () => {
    if (!window.confirm('Cancel this lead order? This cannot be undone.')) return;
    setCancellingLead(true);
    try {
      const { data } = await adminApi.cancelLeadOrder(orderId, {
        note: leadNote.trim() || undefined,
      });
      setOrder(data.data);
      setLeadNote('');
      toast.success('Lead order cancelled');
      onUpdated(true);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel lead');
    } finally {
      setCancellingLead(false);
    }
  };

  const contact = order ? contactLabel(order) : { email: '—', phone: '—' };
  const showLeadActions = Boolean(order?.isLead);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center justify-between gap-3">
          <h3 className="font-semibold text-lg">
            {order ? `Order ${order.orderNumber}` : 'Order details'}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-5 text-sm">
          {loading ? (
            <p className="text-gray-400">Loading...</p>
          ) : !order ? (
            <p className="text-gray-400">Order not found</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {order.isLead && (
                  <span className="text-xs font-bold uppercase px-2 py-1 rounded-full bg-orange-100 text-orange-800">Payment lead</span>
                )}
                {order.isGuest && (
                  <span className="text-xs font-bold uppercase px-2 py-1 rounded-full bg-slate-800 text-white">Guest</span>
                )}
                <span className={`text-xs font-semibold uppercase px-2 py-1 rounded-full ${statusClass(order.status)}`}>
                  {order.status?.replace(/_/g, ' ')}
                </span>
                <span className={`text-xs font-semibold uppercase px-2 py-1 rounded-full ${statusClass(order.payment?.status)}`}>
                  {order.payment?.method} · {order.payment?.status}
                </span>
              </div>

              {showLeadActions && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-orange-900">Unpaid checkout lead</p>
                    <p className="text-xs text-orange-800 mt-1">
                      Payment was not completed. Contact the sender using the details below, then confirm the order
                      after payment is arranged or cancel if the customer does not proceed.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <input
                      className="input-field flex-1 min-w-[140px] bg-white"
                      placeholder="Transaction / reference ID (optional)"
                      value={leadTxnId}
                      onChange={(e) => setLeadTxnId(e.target.value)}
                    />
                    <input
                      className="input-field flex-1 min-w-[160px] bg-white"
                      placeholder="Follow-up note (optional)"
                      value={leadNote}
                      onChange={(e) => setLeadNote(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={confirmLead}
                      disabled={confirmingLead || cancellingLead}
                      className="btn-primary"
                    >
                      {confirmingLead ? 'Confirming...' : 'Confirm order'}
                    </button>
                    <button
                      type="button"
                      onClick={cancelLead}
                      disabled={confirmingLead || cancellingLead}
                      className="btn-secondary text-red-700 border-red-200 hover:bg-red-50"
                    >
                      {cancellingLead ? 'Cancelling...' : 'Cancel lead'}
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-3 space-y-2">
                <p className="text-xs font-bold uppercase text-blue-800">Customer tracking link</p>
                <p className="text-xs text-blue-900 break-all font-mono bg-white/80 rounded px-2 py-1.5 border border-blue-100">
                  {buildTrackingUrl(order)}
                </p>
                <p className="text-xs text-blue-700">
                  Share this link with the customer. They can track using order number
                  {order.trackingEmail ? ` and email (${order.trackingEmail})` : ' (email recommended for security)'}.
                </p>
                <button type="button" onClick={copyTrackingUrl} className="btn-secondary text-xs">
                  Copy tracking link
                </button>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase text-gray-500">Customer</p>
                  <p className="font-medium">{customerLabel(order)}</p>
                  <p className="text-gray-600">{contact.email}</p>
                  <p className="text-gray-600">{contact.phone}</p>
                </div>
                {order.sender?.fullName && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase text-gray-500">Sender</p>
                    <p className="font-medium">{order.sender.fullName}</p>
                    {order.sender.email && <p className="text-gray-600">{order.sender.email}</p>}
                    <p className="text-gray-600">
                      {order.sender.countryCode}{order.sender.phone}
                    </p>
                  </div>
                )}
                {order.receiver?.fullName && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase text-gray-500">Receiver</p>
                    <p className="font-medium">{order.receiver.fullName}</p>
                    <p className="text-gray-600">
                      {order.receiver.countryCode || ''}{order.receiver.phone}
                    </p>
                    <p className="text-gray-600 text-xs">{order.receiver.address}</p>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase text-gray-500">Delivery</p>
                  <p>{order.deliveryLocation?.name || order.shippingAddress?.district || '—'}</p>
                  <p className="text-gray-600">{order.shippingAddress?.street}</p>
                  {order.preferredDeliveryDate && (
                    <p className="text-gray-600">
                      Preferred date: {new Date(order.preferredDeliveryDate).toLocaleDateString()}
                    </p>
                  )}
                  {order.timeSlot?.label && <p className="text-gray-600">Slot: {order.timeSlot.label}</p>}
                </div>
                {order.notes && (
                  <div className="space-y-1">
                    <p className="text-xs font-bold uppercase text-gray-500">Order notes</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{order.notes}</p>
                  </div>
                )}
              </div>

              {(order.deliveryWarnings || []).length > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-1">
                  {order.deliveryWarnings.map((w) => <p key={w}>{w}</p>)}
                </div>
              )}

              {(order.serviceAddons || []).length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase text-gray-500 mb-2">Service add-ons</p>
                  <ul className="space-y-3">
                    {order.serviceAddons.map((addon) => (
                      <li key={addon.id} className="border border-gray-100 rounded-lg p-3 flex gap-3">
                        {addon.photoUrl && (
                          <OrderImage src={addon.photoUrl} alt={addon.name} size="md" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{addon.name}</p>
                          <p className="text-gray-600">Rs. {Number(addon.price).toLocaleString('en-NP')}</p>
                          {addon.customerText && (
                            <p className="text-gray-700 mt-1 whitespace-pre-wrap">
                              <span className="text-gray-500">Customer text: </span>
                              {addon.customerText}
                            </p>
                          )}
                          {addon.photoUrl && (
                            <a href={resolveMediaUrl(addon.photoUrl)} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-600 hover:underline mt-1 inline-block">
                              Open full photo
                            </a>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <p className="text-xs font-bold uppercase text-gray-500 mb-2">Items</p>
                <ul className="space-y-3">
                  {(order.items || []).map((item) => {
                    const img = itemImageUrl(item);
                    const p = item.personalization || {};
                    return (
                      <li key={item._id} className="border border-gray-100 rounded-lg p-3 flex gap-3">
                        <OrderImage src={img} alt={item.name} size="lg" />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between gap-3">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              {item.sku && <p className="text-xs text-gray-500">SKU: {item.sku}</p>}
                              <p className="text-gray-600">Qty: {item.quantity}</p>
                            </div>
                            <p className="font-semibold whitespace-nowrap">
                              Rs. {(item.price * item.quantity).toLocaleString('en-NP')}
                            </p>
                          </div>
                          {item.giftWrap && <p className="text-xs text-gray-500 mt-1">Gift wrap requested</p>}
                          {item.giftMessage && (
                            <p className="text-xs text-gray-600 mt-1">Gift message: {item.giftMessage}</p>
                          )}
                          {(p.cakeMessage || p.giftMessage) && (
                            <div className="mt-2 text-xs text-gray-700 space-y-0.5">
                              {p.cakeMessage && <p><span className="text-gray-500">Cake message:</span> {p.cakeMessage}</p>}
                              {p.giftMessage && <p><span className="text-gray-500">Personalization:</span> {p.giftMessage}</p>}
                            </div>
                          )}
                          {(p.printImageUrl || p.printImageName) && (
                            <div className="mt-2">
                              <p className="text-xs text-gray-500 mb-1">Customer print image</p>
                              {p.printImageUrl ? (
                                <OrderImage src={p.printImageUrl} alt={p.printImageName || 'Print'} size="md" />
                              ) : (
                                <p className="text-xs text-amber-700">Image name: {p.printImageName} (file URL missing)</p>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm max-w-xs ml-auto">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-right">Rs. {Number(order.subtotal || 0).toLocaleString('en-NP')}</span>
                {(order.addonsTotal || 0) > 0 && (
                  <>
                    <span className="text-gray-500">Add-ons</span>
                    <span className="text-right">Rs. {Number(order.addonsTotal).toLocaleString('en-NP')}</span>
                  </>
                )}
                <span className="text-gray-500">Delivery</span>
                <span className="text-right">Rs. {Number(order.shippingFee || 0).toLocaleString('en-NP')}</span>
                {order.discount > 0 && (
                  <>
                    <span className="text-gray-500">Discount</span>
                    <span className="text-right text-emerald-700">- Rs. {Number(order.discount).toLocaleString('en-NP')}</span>
                  </>
                )}
                <span className="font-bold">Total</span>
                <span className="text-right font-bold">Rs. {Number(order.total || 0).toLocaleString('en-NP')}</span>
              </div>

              {(order.statusHistory || []).length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase text-gray-500 mb-2">Status history</p>
                  <ul className="text-xs text-gray-600 space-y-1 max-h-32 overflow-y-auto border border-gray-100 rounded-lg p-2">
                    {order.statusHistory.slice().reverse().map((entry, i) => (
                      <li key={i}>
                        <span className="text-gray-400">{entry.updatedAt ? new Date(entry.updatedAt).toLocaleString() : ''}</span>
                        {' · '}
                        <span className="font-medium capitalize">{entry.status?.replace(/_/g, ' ')}</span>
                        {entry.note && <> — {entry.note}</>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2 border-t border-gray-100 space-y-3">
                <p className="text-xs font-bold uppercase text-gray-500">Update order status</p>
                <div className="flex flex-wrap gap-2">
                  <select className="input-field max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                  <input
                    className="input-field flex-1 min-w-[160px]"
                    placeholder="Note (optional)"
                    value={statusNote}
                    onChange={(e) => setStatusNote(e.target.value)}
                  />
                  <button type="button" onClick={saveStatus} disabled={savingStatus} className="btn-primary">
                    {savingStatus ? 'Saving...' : 'Save status'}
                  </button>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 space-y-3">
                <p className="text-xs font-bold uppercase text-gray-500">Update payment status</p>
                <div className="flex flex-wrap gap-2">
                  <select className="input-field max-w-xs" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
                    {PAYMENT_STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <input
                    className="input-field flex-1 min-w-[140px]"
                    placeholder="Transaction ID (optional)"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                  />
                  <input
                    className="input-field flex-1 min-w-[140px]"
                    placeholder="Note (optional)"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                  />
                  <button type="button" onClick={savePayment} disabled={savingPayment} className="btn-primary">
                    {savingPayment ? 'Saving...' : 'Save payment'}
                  </button>
                </div>
                {order.payment?.paidAt && (
                  <p className="text-xs text-gray-500">
                    Paid at: {new Date(order.payment.paidAt).toLocaleString()}
                    {order.payment.transactionId && <> · Txn: {order.payment.transactionId}</>}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage({ mode = 'orders' }) {
  const isLeads = mode === 'leads';
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null);

  const params = useMemo(() => {
    const p = { page, limit: 25 };
    if (isLeads) {
      p.lead = true;
    } else {
      p.excludeLeads = true;
    }
    if (status) p.status = status;
    if (search.trim()) p.search = search.trim();
    return p;
  }, [page, status, search, isLeads]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await adminApi.getOrders(params);
      setOrders(data.data?.orders || []);
      setPagination(data.data?.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(load, search ? 250 : 0);
    return () => clearTimeout(t);
  }, [params]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{isLeads ? 'Lead orders' : 'Orders'}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {isLeads
            ? 'Checkout attempts where online payment was not completed or failed. Full order details are saved — contact the sender, then confirm or cancel.'
            : 'Confirmed and in-progress orders. Unpaid checkout leads are listed under Lead orders.'}
        </p>
      </div>

      <div className="flex gap-2 text-sm">
        <Link
          to="/admin/orders"
          className={`px-3 py-1.5 rounded-lg border ${!isLeads ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
        >
          Orders
        </Link>
        <Link
          to="/admin/leads"
          className={`px-3 py-1.5 rounded-lg border ${isLeads ? 'bg-orange-600 text-white border-orange-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
        >
          Lead orders
        </Link>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex flex-wrap gap-3">
          <input
            className="input-field max-w-xs"
            placeholder="Search order #, email, phone..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select
            className="input-field max-w-[180px]"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          >
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Order</th>
                <th className="text-left px-4 py-3 font-semibold">Customer</th>
                <th className="text-left px-4 py-3 font-semibold">Contact</th>
                <th className="text-left px-4 py-3 font-semibold">Location</th>
                <th className="text-left px-4 py-3 font-semibold">Total</th>
                <th className="text-left px-4 py-3 font-semibold">Payment</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Date</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">{isLeads ? 'Loading lead orders...' : 'Loading orders...'}</td></tr>
              ) : !orders.length ? (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">{isLeads ? 'No lead orders.' : 'No orders found.'}</td></tr>
              ) : (
                orders.map((order) => {
                  const contact = contactLabel(order);
                  return (
                    <tr key={order._id} className="hover:bg-gray-50 align-top">
                      <td className="px-4 py-3">
                        <div className="font-mono font-semibold">{order.orderNumber}</div>
                        {order.isLead && (
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-orange-100 text-orange-800 mt-1 inline-block">Lead</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{customerLabel(order)}</span>
                          {order.isGuest && (
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-white">Guest</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        <div>{contact.email}</div>
                        <div>{contact.phone}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{order.deliveryLocation?.name || order.shippingAddress?.district || '—'}</td>
                      <td className="px-4 py-3 font-semibold">Rs. {Number(order.total || 0).toLocaleString('en-NP')}</td>
                      <td className="px-4 py-3 text-xs capitalize">{order.payment?.method}<br /><span className="text-gray-500">{order.payment?.status}</span></td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold uppercase px-2 py-1 rounded-full ${statusClass(order.status)}`}>
                          {order.status?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => setDetailId(order._id)} className="text-primary-600 text-xs font-medium hover:underline">
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-sm">
            <span className="text-gray-500">{pagination.total} order(s)</span>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</button>
              <span className="px-2 py-1">Page {page} / {pagination.pages}</span>
              <button type="button" className="btn-secondary text-xs" disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        )}
      </div>

      <OrderDetailModal
        orderId={detailId}
        open={!!detailId}
        onClose={() => setDetailId(null)}
        onUpdated={() => load()}
      />
    </div>
  );
}
