import config from '../config/index.js';
import { getSettings } from './settings.service.js';
import { ApiError } from '../utils/ApiError.js';

const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

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

  return {
    apiKey: map.brevo_api_key || config.email.brevoApiKey || '',
    from: map.email_from || config.email.from,
  };
};

export const sendEmail = async ({ to, subject, html, text }) => {
  const emailConfig = await getEmailConfig();
  if (!emailConfig.apiKey) {
    throw new ApiError(503, 'Brevo is not configured. Set BREVO_API_KEY in .env or Admin → Email settings.');
  }

  const sender = parseSender(emailConfig.from);
  if (!sender?.email) {
    throw new ApiError(503, 'Email From address is not configured. Set EMAIL_FROM or email_from in settings.');
  }

  const recipients = (Array.isArray(to) ? to : [to])
    .map((addr) => String(addr || '').trim())
    .filter(Boolean)
    .map((email) => ({ email }));

  if (!recipients.length) {
    throw new ApiError(400, 'Recipient email is required');
  }

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
    throw new ApiError(503, `Brevo request failed: ${err.message}`);
  }

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body?.message || body?.error || JSON.stringify(body);
    } catch {
      detail = await response.text().catch(() => '');
    }
    throw new ApiError(
      response.status >= 500 ? 503 : 400,
      detail ? `Brevo error: ${detail}` : `Brevo rejected the email (HTTP ${response.status})`
    );
  }

  return response.json().catch(() => null);
};

export const sendTestEmail = async (to) => {
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
