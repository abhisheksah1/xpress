const PENDING_KEY = 'koseli_pending_payment';

function writePending(payload) {
  const raw = JSON.stringify(payload);
  if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(PENDING_KEY, raw);
  if (typeof localStorage !== 'undefined') localStorage.setItem(PENDING_KEY, raw);
}

function readPending() {
  if (typeof sessionStorage !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      /* fall through */
    }
  }
  if (typeof localStorage !== 'undefined') {
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
}

export function savePendingPayment(payload) {
  writePending(payload);
}

export function loadPendingPayment() {
  return readPending();
}

export function clearPendingPayment() {
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(PENDING_KEY);
  if (typeof localStorage !== 'undefined') localStorage.removeItem(PENDING_KEY);
}

export function submitEsewaForm(payment) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = payment.paymentUrl || 'https://esewa.com.np/epay/main';
  form.style.display = 'none';

  const fields = {
    amount: payment.amount,
    tax_amount: payment.tax_amount || '0',
    total_amount: payment.total_amount,
    transaction_uuid: payment.transaction_uuid,
    product_code: payment.product_code,
    product_service_charge: payment.product_service_charge || '0',
    product_delivery_charge: payment.product_delivery_charge || '0',
    success_url: payment.success_url,
    failure_url: payment.failure_url,
    signed_field_names: payment.signed_field_names,
    signature: payment.signature,
  };

  Object.entries(fields).forEach(([key, value]) => {
    if (value == null || value === '') return;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = String(value);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

export function submitFonepayForm(payment) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = payment.paymentUrl || 'https://clientapi.fonepay.com/api/merchantRequest';
  form.style.display = 'none';

  ['merchantCode', 'prn', 'amount', 'date', 'dv', 'returnUrl'].forEach((key) => {
    const value = payment[key];
    if (value == null || value === '') return;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = String(value);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

/** NPS OnePG card gateway — standard application/x-www-form-urlencoded POST. */
export function submitNpsForm(payment) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = payment.paymentUrl
    || (payment.environment === 'production'
      ? 'https://gateway.nepalpayment.com/payment/index'
      : 'https://gatewaysandbox.nepalpayment.com/Payment/Index');
  form.style.display = 'none';

  const fields = {
    MerchantId: payment.MerchantId,
    MerchantName: payment.MerchantName,
    Amount: payment.Amount,
    MerchantTxnId: payment.MerchantTxnId,
    ProcessId: payment.ProcessId,
    TransactionRemarks: payment.TransactionRemarks || '',
    ResponseUrl: payment.ResponseUrl || '',
  };

  if (payment.InstrumentCode) {
    fields.InstrumentCode = payment.InstrumentCode;
  }

  Object.entries(fields).forEach(([key, value]) => {
    if (value == null || value === '') return;
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = key;
    input.value = String(value);
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
}

export function redirectToPayment(method, payment) {
  if (!payment) return false;

  if (method === 'esewa') {
    submitEsewaForm(payment);
    return true;
  }

  if (method === 'fonepay') {
    submitFonepayForm(payment);
    return true;
  }

  if (method === 'card' || payment.type === 'nps_onepg') {
    if (payment.ProcessId && payment.MerchantTxnId) {
      submitNpsForm(payment);
      return true;
    }
  }

  if (method === 'khalti') {
    const url = payment.payment_url || payment.paymentUrl;
    if (url) {
      // assign() navigates immediately; avoid intervening React re-renders that look like cart
      window.location.assign(url);
      return true;
    }
  }

  if (method === 'imepay' || method === 'hbl') {
    const url = payment.paymentUrl || payment.redirectUrl;
    if (url) {
      window.location.assign(url);
      return true;
    }
  }

  return false;
}

export function parseEsewaCallback(searchParams) {
  const encoded = searchParams.get('data');
  if (!encoded) return null;
  try {
    const json = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}
