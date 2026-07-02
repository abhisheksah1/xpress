import nodemailer from 'nodemailer';
import config from '../config/index.js';
import { getSettings } from './settings.service.js';
import { ApiError } from '../utils/ApiError.js';

const getSmtpConfig = async () => {
  const all = await getSettings('email');
  const map = all.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});

  return {
    host: map.smtp_host || config.email.host,
    port: Number(map.smtp_port || config.email.port || 587),
    secure: map.smtp_secure === true || map.smtp_secure === 'true',
    auth: {
      user: map.smtp_user || config.email.user,
      pass: map.smtp_pass || config.email.pass,
    },
    from: map.email_from || config.email.from,
  };
};

export const sendEmail = async ({ to, subject, html, text }) => {
  const smtp = await getSmtpConfig();
  if (!smtp.host || !smtp.auth.user) {
    throw new ApiError(503, 'SMTP is not configured. Set SMTP settings in Store Settings.');
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.auth,
  });

  await transporter.sendMail({
    from: smtp.from,
    to,
    subject,
    html,
    text: text || html?.replace(/<[^>]+>/g, ''),
  });
};

export const sendTestEmail = async (to) => {
  await sendEmail({
    to,
    subject: 'KoseliXpress SMTP Test',
    html: '<p>Your SMTP configuration is working correctly.</p>',
  });
};

export const renderTemplate = (template, vars = {}) => {
  let output = template || '';
  Object.entries(vars).forEach(([key, val]) => {
    output = output.replace(new RegExp(`{{${key}}}`, 'g'), String(val ?? ''));
  });
  return output;
};
