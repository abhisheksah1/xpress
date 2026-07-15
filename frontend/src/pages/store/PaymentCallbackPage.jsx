import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { storeApi } from '../../api/store.js';
import {
  clearPendingPayment,
  loadPendingPayment,
  parseEsewaCallback,
} from '../../utils/checkoutPayment.js';

function resolveCardCallback(params, pending) {
  const merchantTxnId =
    params.get('MerchantTxnId')
    || params.get('merchantTxnId')
    || pending?.orderNumber;
  const gatewayTxnId =
    params.get('GatewayTxnId')
    || params.get('gatewayTxnId')
    || '';

  if (!merchantTxnId) return null;

  return {
    orderId: pending?.orderId,
    method: 'card',
    merchantTxnId,
    gatewayTxnId,
  };
}

export default function PaymentCallbackPage({ mode = 'khalti' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Confirming your payment with the bank...');

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      const params = new URLSearchParams(location.search);

      // Server already processed NPS return and redirected here
      if (mode === 'card' && params.get('payment')) {
        const paymentResult = params.get('payment');
        const serverMessage = params.get('message') || '';
        clearPendingPayment();

        if (paymentResult === 'success') {
          if (!cancelled) {
            setStatus('success');
            setMessage('Payment confirmed. Thank you for your order!');
            toast.success('Payment successful');
            setTimeout(() => navigate('/orders', { replace: true }), 1500);
          }
          return;
        }

        if (paymentResult === 'failed') {
          if (!cancelled) {
            setStatus('error');
            setMessage(serverMessage || 'Payment failed. Your order is saved — you can retry checkout or contact support.');
            toast.error('Payment failed');
          }
          return;
        }

        if (paymentResult === 'pending' || paymentResult === 'error') {
          // Fall through to client verification below
        }
      }

      let pending = loadPendingPayment();

      // Khalti return URL includes purchase_order_id even if browser storage was cleared
      if ((!pending?.orderId || !pending?.method) && mode === 'khalti') {
        const pidx = params.get('pidx') || params.get('token');
        const purchaseOrderId = params.get('purchase_order_id');
        if (pidx && (purchaseOrderId || pending?.orderId)) {
          pending = {
            ...(pending || {}),
            method: 'khalti',
            orderId: pending?.orderId,
            orderNumber: purchaseOrderId || pending?.orderNumber,
          };
        }
      }

      if ((!pending?.orderId || !pending?.method) && mode === 'card') {
        const cardPayload = resolveCardCallback(params, pending);
        if (cardPayload) pending = cardPayload;
      }

      if (!pending?.method || (!pending?.orderId && mode !== 'khalti' && mode !== 'card')) {
        if (!cancelled) {
          setStatus('error');
          setMessage('Payment session expired. Check your orders or contact support.');
        }
        return;
      }

      // Khalti can verify without orderId when purchase_order_id is present
      if (!pending?.orderId && mode === 'khalti' && !params.get('purchase_order_id') && !pending?.orderNumber) {
        if (!cancelled) {
          setStatus('error');
          setMessage('Payment session expired. Check your orders or contact support.');
        }
        return;
      }

      const verifyOnce = async () => {
        let verification = { orderId: pending.orderId, method: pending.method };

        if (pending.method === 'khalti') {
          const token = params.get('pidx') || params.get('token');
          const paymentStatus = params.get('status');
          const purchaseOrderId = params.get('purchase_order_id') || pending.orderNumber;
          if (!token) {
            throw new Error('Khalti payment reference missing');
          }
          if (
            paymentStatus === 'Canceled'
            || paymentStatus === 'User canceled'
            || paymentStatus === 'User cancelled'
            || paymentStatus === 'Expired'
          ) {
            throw new Error('Payment was cancelled');
          }
          verification = {
            ...verification,
            token,
            pidx: token,
            merchantTxnId: purchaseOrderId || undefined,
            purchase_order_id: purchaseOrderId || undefined,
          };
        } else if (pending.method === 'esewa') {
          const decoded = parseEsewaCallback(params);
          if (!decoded || decoded.status !== 'COMPLETE') {
            throw new Error('eSewa payment was not completed');
          }
          verification = {
            ...verification,
            productCode: decoded.product_code,
            totalAmount: decoded.total_amount,
            transactionUuid: decoded.transaction_uuid,
          };
        } else if (pending.method === 'fonepay') {
          verification = {
            ...verification,
            prn: params.get('PRN') || params.get('prn') || pending.orderNumber,
            amount: params.get('P_AMT') || params.get('amount'),
            statusCode: params.get('RC') || params.get('statusCode') || 'success',
          };
        } else if (pending.method === 'card') {
          const cardPayload = resolveCardCallback(params, pending);
          if (!cardPayload) throw new Error('Card payment reference missing');
          verification = cardPayload;
        } else {
          throw new Error('Unsupported payment callback');
        }

        const { data } = await storeApi.verifyPayment(verification);
        return data;
      };

      try {
        const data = await verifyOnce();
        clearPendingPayment();
        if (!cancelled) {
          setStatus('success');
          setMessage(data.message || 'Payment confirmed. Thank you for your order!');
          toast.success('Payment successful');
          setTimeout(() => navigate('/orders', { replace: true }), 1500);
        }
      } catch (err) {
        const statusCode = err.response?.status;
        const errMsg = err.response?.data?.message || err.message || 'Payment verification failed';
        const isPending = statusCode === 202 || /pending/i.test(errMsg);
        const isFailed = statusCode === 400 && !isPending;

        if (isFailed || !isPending) clearPendingPayment();

        if (!cancelled) {
          if (isFailed) {
            setStatus('error');
            setMessage(errMsg || 'Payment failed. Your order remains in pending leads.');
            toast.error('Payment failed');
            return;
          }

          setStatus(isPending ? 'processing' : 'error');
          setMessage(
            isPending
              ? 'Waiting for bank confirmation...'
              : errMsg
          );
          if (!isPending) toast.error('Payment could not be verified');
        }

        if (isPending && pending.method === 'card') {
          for (let i = 0; i < 5 && !cancelled; i++) {
            await new Promise((r) => setTimeout(r, 3000));
            try {
              const data = await verifyOnce();
              clearPendingPayment();
              if (!cancelled) {
                setStatus('success');
                setMessage(data.message || 'Payment confirmed. Thank you for your order!');
                toast.success('Payment successful');
                setTimeout(() => navigate('/orders', { replace: true }), 1500);
              }
              return;
            } catch (retryErr) {
              const retryPending = retryErr.response?.status === 202
                || /pending/i.test(retryErr.response?.data?.message || '');
              if (!retryPending) {
                clearPendingPayment();
                if (!cancelled) {
                  setStatus('error');
                  setMessage(retryErr.response?.data?.message || 'Payment failed');
                  toast.error('Payment failed');
                }
                return;
              }
            }
          }
        }
      }
    };

    if (mode === 'esewa-failure') {
      clearPendingPayment();
      setStatus('error');
      setMessage('eSewa payment was cancelled or failed.');
      return () => { cancelled = true; };
    }

    finish();
    return () => { cancelled = true; };
  }, [location.search, mode, navigate]);

  return (
    <div className="max-w-lg mx-auto px-4 py-20 text-center">
      <h1 className="text-2xl font-bold text-slate-900 mb-3">
        {status === 'processing' && 'Processing payment'}
        {status === 'success' && 'Payment successful'}
        {status === 'error' && 'Payment issue'}
      </h1>
      <p className="text-slate-600 mb-6">{message}</p>
      {status === 'error' && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/shop" className="btn-primary">Try again</Link>
          <Link to="/track" className="btn-secondary">Track order</Link>
        </div>
      )}
    </div>
  );
}
