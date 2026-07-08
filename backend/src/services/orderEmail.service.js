import config from '../config/index.js';
import { PAYMENT_METHODS } from '../config/constants.js';
import { getSettings } from './settings.service.js';
import { getGatewayById } from './paymentGateway.service.js';
import { renderTemplate, sendEmail } from './email.service.js';

const MANUAL_PAYMENT_NOTICE =
  'Important: Until your payment is confirmed by Koseli Xpress, we may not process your order. Please complete the bank transfer and keep your payment reference handy.';

const DEFAULT_ORDER_CONFIRMATION = {
  subject: 'Order received – {{order_number}} | Koseli Xpress',
  body: `Hi {{customer_name}},

Thank you for ordering with Koseli Xpress.

Order number: {{order_number}}
Total: {{total}}

Track your order anytime using this link:
{{tracking_url}}

{{payment_pending_note}}

{{payment_instructions}}

If you need help, contact us at {{support_email}} or WhatsApp: {{support_whatsapp}}.

Thank you,
Koseli Xpress`,
};

export const getOrderSenderEmail = (order) => {
  const email =
    order.sender?.email?.trim()
    || order.guestEmail?.trim()
    || order.shippingAddress?.email?.trim()
    || order.user?.email?.trim()
    || '';
  return email.toLowerCase();
};

export const buildOrderTrackingUrl = (order) => {
  const email = getOrderSenderEmail(order);
  const params = new URLSearchParams({ orderNumber: order.orderNumber });
  if (email) params.set('email', email);
  const base = (config.clientUrl || '').replace(/\/$/, '');
  return `${base}/track?${params.toString()}`;
};

const formatOrderTotal = (order) => {
  const currency = order.checkoutCurrency || 'NPR';
  const amount = Number(order.total || 0).toLocaleString('en-NP', {
    minimumFractionDigits: currency === 'NPR' ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return currency === 'NPR' ? `Rs. ${amount}` : `${currency} ${amount}`;
};

export const getManualBankPaymentDetails = async () => {
  const gateway = await getGatewayById(PAYMENT_METHODS.MANUAL_BANK);
  const creds = gateway?.credentials || {};

  const settings = await getSettings('registry');
  const registry = settings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});

  let whatsapp = '';
  try {
    const pluginSettings = await getSettings('plugins');
    const plugins = pluginSettings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
    whatsapp = plugins.plugins_config?.whatsapp_number || '';
  } catch {
    /* optional */
  }

  return {
    bankName: creds.bankName || '',
    accountName: creds.accountHolder || '',
    accountNumber: creds.accountNumber || '',
    branchName: creds.branchName || '',
    instruction: creds.instruction || '',
    qrCodeImage: creds.qrCodeImage || '',
    csrWhatsApp: registry.registry_helpdesk_whatsapp || whatsapp || '',
  };
};

const buildPaymentInstructions = (order, manualDetails) => {
  if (order.payment?.method !== PAYMENT_METHODS.MANUAL_BANK) return '';

  const lines = [
    '— Payment details (Manual bank transfer / QR) —',
    manualDetails.bankName && `Bank / Wallet: ${manualDetails.bankName}`,
    manualDetails.accountName && `Account name: ${manualDetails.accountName}`,
    manualDetails.accountNumber && `Account number: ${manualDetails.accountNumber}`,
    manualDetails.branchName && `Branch: ${manualDetails.branchName}`,
    `Amount to pay: ${formatOrderTotal(order)}`,
    `Reference: Please use order number ${order.orderNumber} as payment reference.`,
    manualDetails.instruction,
    manualDetails.qrCodeImage && `QR code image: ${manualDetails.qrCodeImage}`,
    manualDetails.csrWhatsApp && `After paying, you may share proof on WhatsApp: ${manualDetails.csrWhatsApp}`,
  ].filter(Boolean);

  return lines.join('\n');
};

const buildPaymentPendingNote = (order) => {
  const method = order.payment?.method;
  const isPaid = order.payment?.status === 'paid';

  if (isPaid) return '';

  if (method === PAYMENT_METHODS.MANUAL_BANK) {
    return MANUAL_PAYMENT_NOTICE;
  }

  if (method === PAYMENT_METHODS.COD) {
    return 'Payment will be collected on delivery (Cash on Delivery).';
  }

  return 'Please complete your online payment to confirm this order. Until payment is confirmed, Koseli Xpress may not process your order.';
};

const buildTemplateVars = async (order, trackingUrl) => {
  const manualDetails = await getManualBankPaymentDetails();

  const registrySettings = await getSettings('registry');
  const registry = registrySettings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});

  return {
    customer_name: order.sender?.fullName || order.shippingAddress?.fullName || 'Customer',
    order_number: order.orderNumber,
    total: formatOrderTotal(order),
    tracking_url: trackingUrl,
    payment_instructions: buildPaymentInstructions(order, manualDetails),
    payment_pending_note: buildPaymentPendingNote(order),
    support_email: registry.registry_support_email || 'support@koselixpress.com',
    support_whatsapp: manualDetails.csrWhatsApp || '',
  };
};

const buildHtmlBody = (textBody, trackingUrl, order, manualDetails) => {
  const paragraphs = textBody
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      if (line === trackingUrl) {
        return `<p><a href="${trackingUrl}" style="color:#e11d48;font-weight:600;">Track your order</a></p><p style="font-size:12px;color:#64748b;word-break:break-all;">${trackingUrl}</p>`;
      }
      if (line.startsWith('— Payment details')) {
        return `<p style="margin-top:16px;font-weight:700;color:#0f172a;">${line}</p>`;
      }
      return `<p style="margin:0 0 8px;line-height:1.5;color:#334155;">${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
    })
    .join('');

  const qrBlock = order.payment?.method === PAYMENT_METHODS.MANUAL_BANK && manualDetails.qrCodeImage
    ? `<p style="margin-top:12px;"><img src="${manualDetails.qrCodeImage}" alt="Payment QR code" style="max-width:220px;height:auto;border:1px solid #e2e8f0;border-radius:8px;" /></p>`
    : '';

  return `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:8px 0;">
    ${paragraphs}
    ${qrBlock}
  </div>`;
};

/** Send one-time order confirmation to the sender email (not sent on status updates). */
export const sendOrderConfirmationEmail = async (order) => {
  const to = getOrderSenderEmail(order);
  if (!to) {
    console.warn(`[orderEmail] Skipped confirmation for ${order.orderNumber}: no sender email`);
    return { sent: false, reason: 'no_email' };
  }

  const trackingUrl = buildOrderTrackingUrl(order);
  const vars = await buildTemplateVars(order, trackingUrl);

  let tpl = DEFAULT_ORDER_CONFIRMATION;
  try {
    const emailSettings = await getSettings('email');
    const map = emailSettings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
    if (map.email_templates?.order_confirmation?.subject) {
      tpl = map.email_templates.order_confirmation;
    }
  } catch {
    /* use default */
  }

  const subject = renderTemplate(tpl.subject || DEFAULT_ORDER_CONFIRMATION.subject, vars);
  let body = renderTemplate(tpl.body || DEFAULT_ORDER_CONFIRMATION.body, vars);

  // Clean up empty placeholder lines when optional sections are blank
  body = body
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s*\n/gm, '')
    .trim();

  const manualDetails = await getManualBankPaymentDetails();
  const html = buildHtmlBody(body, trackingUrl, order, manualDetails);

  await sendEmail({ to, subject, text: body, html });
  return { sent: true, to };
};
