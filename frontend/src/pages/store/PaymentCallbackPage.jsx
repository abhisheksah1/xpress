import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { storeApi } from '../../api/store.js';
import {
  clearPendingPayment,
  loadPendingPayment,
  parseEsewaCallback,
} from '../../utils/checkoutPayment.js';

export default function PaymentCallbackPage({ mode = 'khalti' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Confirming your payment...');

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      const pending = loadPendingPayment();
      const params = new URLSearchParams(location.search);

      if (!pending?.orderId || !pending?.method) {
        if (!cancelled) {
          setStatus('error');
          setMessage('Payment session expired. Check your orders or contact support.');
        }
        return;
      }

      try {
        let verification = { orderId: pending.orderId, method: pending.method };

        if (pending.method === 'khalti') {
          const token = params.get('pidx') || params.get('token');
          const paymentStatus = params.get('status');
          if (!token || paymentStatus === 'Canceled' || paymentStatus === 'User canceled') {
            throw new Error('Payment was cancelled');
          }
          verification = { ...verification, token };
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
          const merchantTxnId =
            params.get('MerchantTxnId')
            || params.get('merchantTxnId')
            || pending.orderNumber;
          const gatewayTxnId =
            params.get('GatewayTxnId')
            || params.get('gatewayTxnId')
            || '';
          if (!merchantTxnId) throw new Error('Card payment reference missing');
          verification = { ...verification, merchantTxnId, gatewayTxnId };
        } else {
          throw new Error('Unsupported payment callback');
        }

        await storeApi.verifyPayment(verification);
        clearPendingPayment();
        if (!cancelled) {
          setStatus('success');
          setMessage('Payment confirmed. Thank you for your order!');
          toast.success('Payment successful');
          setTimeout(() => navigate('/orders', { replace: true }), 1500);
        }
      } catch (err) {
        clearPendingPayment();
        if (!cancelled) {
          setStatus('error');
          setMessage(err.response?.data?.message || err.message || 'Payment verification failed');
          toast.error('Payment could not be verified');
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
          <Link to="/orders" className="btn-primary">View orders</Link>
          <Link to="/track" className="btn-secondary">Track order</Link>
        </div>
      )}
    </div>
  );
}
