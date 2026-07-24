import nodemailer from 'nodemailer';
import {
  Brevo,
  BrevoClient,
  BrevoError,
  logging,
} from '@getbrevo/brevo';
import config from '../config/index.js';
import { getSettings } from './settings.service.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Brevo email delivery
 * - Preferred: SMTP relay (smtp-relay.brevo.com) — reliable on free accounts
 * - Optional: Transactional API (@getbrevo/brevo) when BREVO_EMAIL_TRANSPORT=api
 * Docs: https://developers.brevo.com/guides/node-js
 */

const BREVO_SMTP_HOST = process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com';
const BREVO_SMTP_PORT = Number(process.env.BREVO_SMTP_PORT || 587);

const maskSecret = (key = '') => {
  const value = String(key || '').trim();
  if (!value) return '(missing)';
  if (value.length <= 12) return `${value.slice(0, 4)}…`;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
};

const parseFromAddress = (from) => {
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
  return { name: '', email: '' };
};

const normalizeRecipients = (to) => {
  const list = Array.isArray(to)
    ? to
    : String(to || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean);

  return list.map((email) => ({ email: String(email).trim() })).filter((row) => row.email);
};

const resolveEmailConfig = async () => {
  const all = await getSettings('email');
  const map = all.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});

  const envKey = String(config.email.brevoApiKey || '').trim();
  const settingsKey = String(map.brevo_api_key || '').trim();
  const apiKey = envKey || settingsKey;

  const envSenderEmail = String(config.email.senderEmail || '').trim();
  const envSenderName = String(config.email.senderName || '').trim();
  const parsedFrom = parseFromAddress(process.env.EMAIL_FROM || map.email_from || config.email.from);

  const senderEmail = envSenderEmail || parsedFrom.email;
  const senderName = envSenderName || parsedFrom.name || 'KoseliXpress';

  const smtpLogin = String(config.email.smtpLogin || process.env.BREVO_SMTP_LOGIN || '').trim();
  const smtpKey = String(config.email.smtpKey || process.env.BREVO_SMTP_KEY || '').trim();

  // Default to SMTP — API accepts messages on this account but delivers 0 (empty event reports).
  const transport = String(process.env.BREVO_EMAIL_TRANSPORT || 'smtp').trim().toLowerCase();

  return {
    apiKey,
    senderEmail,
    senderName,
    smtpLogin,
    smtpKey,
    transport: transport === 'api' ? 'api' : 'smtp',
  };
};

let brevoClient = null;
let brevoClientKey = '';
let cachedSmtpLogin = '';

const getBrevoClient = (apiKey) => {
  if (!apiKey) return null;
  if (brevoClient && brevoClientKey === apiKey) return brevoClient;

  brevoClientKey = apiKey;
  brevoClient = new BrevoClient({
    apiKey,
    timeoutInSeconds: Number(process.env.BREVO_TIMEOUT_SECONDS || 30),
    maxRetries: Number(process.env.BREVO_MAX_RETRIES || 2),
    ...(process.env.BREVO_DEBUG === 'true'
      ? {
          logging: {
            level: logging.LogLevel.Debug,
            logger: new logging.ConsoleLogger(),
          },
        }
      : {}),
  });
  return brevoClient;
};

const resolveSmtpLogin = async (cfg) => {
  if (cfg.smtpLogin) return cfg.smtpLogin;
  if (cachedSmtpLogin) return cachedSmtpLogin;
  if (!cfg.apiKey) return '';

  try {
    const client = getBrevoClient(cfg.apiKey);
    const account = await client.account.getAccount();
    const login = account?.relay?.data?.userName || '';
    if (login) {
      cachedSmtpLogin = login;
      console.log(`[brevo] SMTP login resolved from account: ${login}`);
    }
    return login;
  } catch (err) {
    console.warn('[brevo] could not resolve SMTP login from account:', err.message);
    return '';
  }
};

export const isBrevoConfigured = async () => {
  const cfg = await resolveEmailConfig();
  if (!cfg.senderEmail) return false;
  if (cfg.transport === 'api') return Boolean(cfg.apiKey);
  return Boolean(cfg.smtpKey || cfg.apiKey);
};

export const logBrevoConfigStatus = async () => {
  try {
    const cfg = await resolveEmailConfig();
    const smtpLogin = cfg.transport === 'smtp' ? await resolveSmtpLogin(cfg) : cfg.smtpLogin;
    const ready =
      Boolean(cfg.senderEmail) &&
      (cfg.transport === 'api' ? Boolean(cfg.apiKey) : Boolean(cfg.smtpKey));

    console.log('[brevo] configuration');
    console.log(`  transport:   ${cfg.transport}`);
    console.log(`  ready:       ${ready ? 'yes' : 'NO'}`);
    console.log(`  senderEmail: ${cfg.senderEmail || '(missing)'}`);
    console.log(`  senderName:  ${cfg.senderName || '(missing)'}`);
    if (cfg.transport === 'smtp') {
      console.log(`  smtpHost:    ${BREVO_SMTP_HOST}:${BREVO_SMTP_PORT}`);
      console.log(`  smtpLogin:   ${smtpLogin || '(missing — set BREVO_SMTP_LOGIN)'}`);
      console.log(`  smtpKey:     ${maskSecret(cfg.smtpKey)}`);
      if (!cfg.smtpKey) {
        console.warn(
          '[brevo] SMTP key missing. Set BREVO_SMTP_KEY from Brevo → SMTP & API → SMTP'
        );
      }
    } else {
      console.log(`  apiKey:      ${maskSecret(cfg.apiKey)}`);
    }

    return { ready, ...cfg, smtpLogin };
  } catch (err) {
    console.error('[brevo] failed to read configuration:', err.message);
    return { ready: false, error: err.message };
  }
};

const sendViaSmtp = async ({ cfg, recipients, subject, html, text }) => {
  const smtpLogin = await resolveSmtpLogin(cfg);
  if (!cfg.smtpKey) {
    throw new ApiError(
      503,
      'Brevo SMTP key missing. Set BREVO_SMTP_KEY (xsmtpsib-…) from Brevo → SMTP & API → SMTP'
    );
  }
  if (!smtpLogin) {
    throw new ApiError(
      503,
      'Brevo SMTP login missing. Set BREVO_SMTP_LOGIN (e.g. xxxxx@smtp-brevo.com)'
    );
  }

  const toList = recipients.map((r) => r.email).join(', ');
  console.log(
    `[brevo:smtp] sending → to=${toList} subject="${subject}" from=${cfg.senderName} <${cfg.senderEmail}> login=${smtpLogin}`
  );

  const transporter = nodemailer.createTransport({
    host: BREVO_SMTP_HOST,
    port: BREVO_SMTP_PORT,
    secure: false,
    auth: {
      user: smtpLogin,
      pass: cfg.smtpKey,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: `"${cfg.senderName || 'KoseliXpress'}" <${cfg.senderEmail}>`,
      to: toList,
      subject,
      html: html || `<p>${text || ''}</p>`,
      text: text || (html ? html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : ''),
    });

    console.log(`[brevo:smtp] Email sent. Message ID: ${info.messageId || 'smtp-sent'}`);
    return { success: true, messageId: info.messageId, transport: 'smtp', info };
  } catch (err) {
    const raw = err.response || err.message || String(err);
    console.error('[brevo:smtp] send failed:', raw);

    if (/Unauthorized IP/i.test(raw) || /525/.test(raw)) {
      throw new ApiError(
        503,
        'Brevo blocked this server IP. In Brevo → SMTP & API → SMTP, authorize your current public IP (or allow all IPs), then retry.'
      );
    }
    if (/Authentication failed|Invalid login|535/i.test(raw)) {
      throw new ApiError(
        503,
        'Brevo SMTP login failed. Check BREVO_SMTP_LOGIN and BREVO_SMTP_KEY (use xsmtpsib-… key, not the short password).'
      );
    }

    throw new ApiError(503, `Brevo SMTP error: ${raw}`);
  }
};

const sendViaApi = async ({ cfg, recipients, subject, html, text }) => {
  if (!cfg.apiKey) {
    throw new ApiError(503, 'Brevo API key missing. Set BREVO_API_KEY');
  }

  const toList = recipients.map((r) => r.email).join(', ');
  console.log(
    `[brevo:api] sending → to=${toList} subject="${subject}" from=${cfg.senderName} <${cfg.senderEmail}>`
  );

  const brevo = getBrevoClient(cfg.apiKey);
  try {
    const result = await brevo.transactionalEmails.sendTransacEmail({
      subject,
      htmlContent: html || `<html><body><p>${text || ''}</p></body></html>`,
      textContent: text || (html ? html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : ''),
      sender: {
        name: cfg.senderName || 'KoseliXpress',
        email: cfg.senderEmail,
      },
      to: recipients,
    });

    const messageId = result?.messageId || 'brevo-sent';
    console.log(`[brevo:api] Email sent. Message ID: ${messageId}`);
    return { success: true, messageId, transport: 'api', result };
  } catch (err) {
    if (err instanceof Brevo.UnauthorizedError) {
      throw new ApiError(401, 'Brevo error: Invalid API key');
    }
    if (err instanceof Brevo.TooManyRequestsError) {
      throw new ApiError(429, 'Brevo error: Rate limited. Try again shortly.');
    }
    if (err instanceof BrevoError) {
      console.error(`[brevo:api] API error ${err.statusCode}:`, err.message);
      throw new ApiError(
        err.statusCode && err.statusCode < 500 ? 400 : 503,
        `Brevo error: ${err.message}`
      );
    }
    throw new ApiError(503, `Brevo error: ${err?.message || 'Unknown error'}`);
  }
};

export const sendEmail = async ({ to, subject, html, text }) => {
  const cfg = await resolveEmailConfig();

  if (!cfg.senderEmail) {
    throw new ApiError(503, 'Brevo sender missing. Set BREVO_SENDER_EMAIL');
  }

  const recipients = normalizeRecipients(to);
  if (!recipients.length) {
    throw new ApiError(400, 'Recipient email is required');
  }

  try {
    if (cfg.transport === 'api') {
      return await sendViaApi({ cfg, recipients, subject, html, text });
    }
    return await sendViaSmtp({ cfg, recipients, subject, html, text });
  } catch (err) {
    // Do not silently fall back to API — it can return messageId without delivering.
    console.error('[brevo] send failed:', err.message);
    if (err instanceof ApiError) throw err;
    throw new ApiError(503, err.message || 'Failed to send email via Brevo');
  }
};

export const sendTestEmail = async (to) => {
  console.log(`[brevo] test email requested → ${to}`);
  await sendEmail({
    to,
    subject: 'KoseliXpress Brevo Test',
    html: '<html><body><p>Your Brevo email configuration is working correctly.</p></body></html>',
  });
};

export const renderTemplate = (template, vars = {}) => {
  let output = template || '';
  Object.entries(vars).forEach(([key, val]) => {
    output = output.replace(new RegExp(`{{${key}}}`, 'g'), String(val ?? ''));
  });
  return output;
};
