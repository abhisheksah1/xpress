import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { storeApi } from '../../api/store.js';
import { useCartStore } from '../../store/cartStore.js';
import { clearPendingPayment, loadPendingPayment, savePendingPayment } from '../../utils/checkoutPayment.js';

const METHOD_LABELS = {
  imepay: 'IME Pay',
  hbl: 'HBL',
  khalti: 'Khalti',
  esewa: 'eSewa',
  fonepay: 'Fonepay',
  card: 'Card (NPS)',
};

const CALLBACK_PATH = {
  imepay: '/checkout/imepay/callback',
  hbl: '/checkout/hbl/callback',
  khalti: '/checkout/khalti/callback',
  esewa: '/checkout/esewa/failure',
  fonepay: '/checkout/fonepay/callback',
  card: '/checkout/card/callback',
};

export default function PaymentSandboxPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const clearCart = useCartStore((s) => s.clearCart);
  const [busy, setBusy] = useState(false);

  const session = useMemo(() => {
    const pending = loadPendingPayment() || {};
    return {
      method: params.get('method') || pending.method || 'imepay',
      orderId: params.get('orderId') || pending.orderId || '',
      orderNumber: params.get('orderNumber') || pending.orderNumber || '',
      amount: params.get('amount') || pending.total || '',
      email: pending.email || '',
      sandboxNonce: params.get('sandboxNonce') || pending.sandboxNonce || '',
    };
  }, [params]);

  const label = METHOD_LABELS[session.method] || session.method;

  const finish = async (success) => {
    if (!session.orderId || !session.method) {
      toast.error('Missing sandbox payment session');
      return;
    }

    setBusy(true);
    savePendingPayment({
      orderId: session.orderId,
      method: session.method,
      orderNumber: session.orderNumber,
      total: session.amount,
      email: session.email,
      sandboxNonce: session.sandboxNonce,
    });

    try {
      if (!success) {
        clearPendingPayment();
        toast.error(`${label} sandbox payment cancelled`);
        const failPath = CALLBACK_PATH[session.method] || '/checkout/imepay/callback';
        navigate(`${failPath}?payment=failed`, { replace: true });
        return;
      }

      if (!session.sandboxNonce) {
        throw new Error('Missing sandbox payment token. Restart checkout and try again.');
      }

      const { data } = await storeApi.verifyPayment({
        orderId: session.orderId,
        method: session.method,
        sandbox: true,
        status: 'sandbox_success',
        sandboxNonce: session.sandboxNonce,
        transactionId: `${session.method}-sandbox-${Date.now()}`,
      });

      clearCart();
      clearPendingPayment();
      toast.success(data.message || 'Sandbox payment confirmed');
      const email = session.email || '';
      navigate(
        session.orderNumber
          ? `/track?orderNumber=${encodeURIComponent(session.orderNumber)}&email=${encodeURIComponent(email)}`
          : '/orders',
        { replace: true }
      );
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Sandbox payment verification failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-16">
      <div className="card space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-700">Sandbox test payment</p>
          <h1 className="text-2xl font-extrabold text-slate-900 mt-1">{label}</h1>
          <p className="text-sm text-slate-500 mt-1">
            No live bank call — use this page to simulate a successful or failed payment.
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3 text-sm space-y-1">
          <p><span className="text-slate-500">Order</span> <span className="font-semibold">{session.orderNumber || '—'}</span></p>
          <p><span className="text-slate-500">Amount</span> <span className="font-semibold">Rs. {session.amount || '—'}</span></p>
          <p className="text-xs text-slate-400 break-all">ID: {session.orderId || '—'}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => finish(true)}
            className="flex-1 min-h-[48px] rounded-lg bg-[#16a34a] hover:bg-[#15803d] text-white font-bold disabled:opacity-50"
          >
            {busy ? 'Processing…' : 'Simulate success'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => finish(false)}
            className="flex-1 min-h-[48px] rounded-lg border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-50"
          >
            Simulate failure
          </button>
        </div>

        <p className="text-center text-xs text-slate-400">
          <Link to="/checkout" className="underline hover:text-slate-600">Back to checkout</Link>
        </p>
      </div>
    </div>
  );
}
