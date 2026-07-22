import config from '../config/index.js';
import { getSettings } from './settings.service.js';
import { ApiError } from '../utils/ApiError.js';

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

const maskApiKey = (key = '') => {
  const value = String(key || '').trim();
  if (!value) return '(missing)';
  if (value.length <= 12) return `${value.slice(0, 4)}…`;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
};

const parseSender = (from) => {
  const raw = String(from || '').trim();
  const match = raw.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    return {
      name: match[1].trim() || 'KoseliXpress',
      email: match[2].trim(),
    };
  }
  if (raw.includes('@')) {
    return { name: 'KoseliXpress', email: raw };
  }
  return null;
};

const getEmailConfig = async () => {
  const all = await getSettings('email');
  const map = all.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});

  const settingsKey = String(map.brevo_api_key || '').trim();
  const envKey = String(config.email.brevoApiKey || '').trim();
  const apiKey = settingsKey || envKey;
  const keySource = settingsKey ? 'admin-settings' : envKey ? 'env' : 'none';

  return {
    apiKey,
    keySource,
    from: map.email_from || config.email.from,
  };
};

/** Log Brevo readiness once at server startup (and reusable for debugging). */
export const logBrevoConfigStatus = async () => {
  try {
    const emailConfig = await getEmailConfig();
    const sender = parseSender(emailConfig.from);
    const ready = Boolean(emailConfig.apiKey && sender?.email);

    console.log('[brevo] configuration');
    console.log(`  ready:     ${ready ? 'yes' : 'NO — emails will fail until configured'}`);
    console.log(`  apiKey:    ${maskApiKey(emailConfig.apiKey)} (source: ${emailConfig.keySource})`);
    console.log(`  from:      ${emailConfig.from || '(missing)'}`);
    console.log(`  sender:    ${sender ? `${sender.name} <${sender.email}>` : '(invalid)'}`);
    console.log(`  endpoint:  ${BREVO_SEND_URL}`);

    return { ready, ...emailConfig, sender };
  } catch (err) {
    console.error('[brevo] failed to read configuration:', err.message);
    return { ready: false, error: err.message };
  }
};

export const sendEmail = async ({ to, subject, html, text }) => {
  const emailConfig = await getEmailConfig();
  if (!emailConfig.apiKey) {
    console.error('[brevo] not configured — missing API key (set BREVO_API_KEY or Admin → Brevo settings)');
    throw new ApiError(503, 'Brevo is not configured. Set BREVO_API_KEY in .env or Admin → Email settings.');
  }

  const sender = parseSender(emailConfig.from);
  if (!sender?.email) {
    console.error('[brevo] not configured — missing/invalid EMAIL_FROM:', emailConfig.from || '(empty)');
    throw new ApiError(503, 'Email From address is not configured. Set EMAIL_FROM or email_from in settings.');
  }

  const recipients = (Array.isArray(to) ? to : [to])
    .map((addr) => String(addr || '').trim())
    .filter(Boolean)
    .map((email) => ({ email }));

  if (!recipients.length) {
    throw new ApiError(400, 'Recipient email is required');
  }

  const toList = recipients.map((r) => r.email).join(', ');
  console.log(
    `[brevo] sending → to=${toList} subject="${subject}" from=${sender.email} key=${maskApiKey(emailConfig.apiKey)} (${emailConfig.keySource})`
  );

  const payload = {
    sender,
    to: recipients,
    subject,
    htmlContent: html || `<p>${text || ''}</p>`,
    textContent: text || html?.replace(/<[^>]+>/g, '') || '',
  };

  let response;
  try {
    response = await fetch(BREVO_SEND_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': emailConfig.apiKey,
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error('[brevo] network error:', err.message);
    throw new ApiError(503, `Brevo request failed: ${err.message}`);
  }

  if (!response.ok) {
    let detail = '';
    let body = null;
    try {
      body = await response.json();
      detail = body?.message || body?.error || JSON.stringify(body);
    } catch {
      detail = await response.text().catch(() => '');
    }
    console.error(`[brevo] rejected HTTP ${response.status}:`, detail || body || '(no body)');
    throw new ApiError(
      response.status >= 500 ? 503 : 400,
      detail ? `Brevo error: ${detail}` : `Brevo rejected the email (HTTP ${response.status})`
    );
  }

  const result = await response.json().catch(() => null);
  console.log(
    `[brevo] sent OK → to=${toList} messageId=${result?.messageId || result?.messageIds || 'n/a'}`
  );
  return result;
};

export const sendTestEmail = async (to) => {
  console.log(`[brevo] test email requested → ${to}`);
  await sendEmail({
    to,
    subject: 'KoseliXpress Brevo Test',
    html: '<p>Your Brevo email configuration is working correctly.</p>',
  });
};

export const renderTemplate = (template, vars = {}) => {
  let output = template || '';
  Object.entries(vars).forEach(([key, val]) => {
    output = output.replace(new RegExp(`{{${key}}}`, 'g'), String(val ?? ''));
  });
  return output;
};
