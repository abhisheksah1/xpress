import { Reminder } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { getSettings } from './settings.service.js';
import { renderTemplate, sendEmail } from './email.service.js';

const parseDate = (d) => (d ? new Date(d) : null);

export const getMyReminders = async (userId) => {
  return Reminder.find({ customer: userId }).sort({ occasionDate: 1, createdAt: -1 });
};

export const createReminder = async (userId, data) => {
  const occasionDate = parseDate(data.occasionDate);
  if (!occasionDate || Number.isNaN(occasionDate.getTime())) {
    throw new ApiError(400, 'Invalid occasion date');
  }

  return Reminder.create({
    customer: userId,
    createdBy: userId,
    title: data.title,
    occasionDate,
    recipientName: data.recipientName,
    relation: data.relation,
    deliveryLocationText: data.deliveryLocationText,
    notes: data.notes,
    isActive: data.isActive !== false,
  });
};

export const updateMyReminder = async (userId, id, data) => {
  const reminder = await Reminder.findOne({ _id: id, customer: userId });
  if (!reminder) throw new ApiError(404, 'Reminder not found');

  if (data.occasionDate) {
    const occasionDate = parseDate(data.occasionDate);
    if (!occasionDate || Number.isNaN(occasionDate.getTime())) {
      throw new ApiError(400, 'Invalid occasion date');
    }
    reminder.occasionDate = occasionDate;
  }

  if (data.title !== undefined) reminder.title = data.title;
  if (data.recipientName !== undefined) reminder.recipientName = data.recipientName;
  if (data.relation !== undefined) reminder.relation = data.relation;
  if (data.deliveryLocationText !== undefined) reminder.deliveryLocationText = data.deliveryLocationText;
  if (data.notes !== undefined) reminder.notes = data.notes;
  if (data.isActive !== undefined) reminder.isActive = data.isActive;

  await reminder.save();
  return reminder;
};

export const deleteMyReminder = async (userId, id) => {
  const reminder = await Reminder.findOneAndDelete({ _id: id, customer: userId });
  if (!reminder) throw new ApiError(404, 'Reminder not found');
};

export const adminListReminders = async ({ from, to, search, isActive, page = 1, limit = 50 }) => {
  const filter = {};
  if (isActive !== undefined) filter.isActive = isActive === 'true' || isActive === true;
  if (from || to) {
    filter.occasionDate = {};
    if (from) filter.occasionDate.$gte = new Date(from);
    if (to) filter.occasionDate.$lte = new Date(to);
  }
  if (search) {
    filter.$or = [
      { recipientName: { $regex: search, $options: 'i' } },
      { relation: { $regex: search, $options: 'i' } },
      { deliveryLocationText: { $regex: search, $options: 'i' } },
      { title: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [reminders, total] = await Promise.all([
    Reminder.find(filter)
      .populate('customer', 'name email phone')
      .sort({ occasionDate: 1 })
      .skip(skip)
      .limit(Number(limit)),
    Reminder.countDocuments(filter),
  ]);

  return { reminders, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) || 1 } };
};

export const adminSendReminder = async ({ reminderId, subject, message }, adminUser) => {
  const reminder = await Reminder.findById(reminderId).populate('customer', 'name email phone');
  if (!reminder) throw new ApiError(404, 'Reminder not found');
  if (!reminder.isActive) throw new ApiError(400, 'Reminder is inactive');

  const customerEmail = reminder.customer?.email;
  if (!customerEmail) throw new ApiError(400, 'Customer email not found');

  const emailSettings = await getSettings('email');
  const map = emailSettings.reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
  const templates = map.email_templates || {};
  const tpl = templates.reminder || {
    subject: 'Reminder: {{title}} on {{occasion_date}}',
    body:
      'Hi {{customer_name}},\\n\\nThis is a reminder for {{title}} ({{relation}}) on {{occasion_date}}.\\nDelivery location note: {{delivery_location}}\\n\\nYou can place your order anytime from our store.',
  };

  const dateLabel = new Date(reminder.occasionDate).toLocaleDateString();
  const vars = {
    customer_name: reminder.customer?.name || 'Customer',
    title: reminder.title || 'Special date',
    recipient_name: reminder.recipientName || '',
    relation: reminder.relation || '',
    occasion_date: dateLabel,
    delivery_location: reminder.deliveryLocationText || '',
    admin_name: adminUser?.name || 'Admin',
    custom_message: message || '',
  };

  const finalSubject = subject?.trim()
    ? renderTemplate(subject, vars)
    : renderTemplate(tpl.subject, vars);
  const bodyText = message?.trim()
    ? renderTemplate(message, vars)
    : renderTemplate(tpl.body, vars);

  const html = `<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">\n` +
    `<p>Hi ${vars.customer_name},</p>\n` +
    `<p><strong>${vars.title}</strong>${vars.relation ? ` (${vars.relation})` : ''} is on <strong>${vars.occasion_date}</strong>.</p>\n` +
    `${vars.delivery_location ? `<p><strong>Delivery location note:</strong> ${vars.delivery_location}</p>\n` : ''}` +
    `<pre style="white-space:pre-wrap;background:#f8fafc;border:1px solid #e2e8f0;padding:12px;border-radius:8px">${bodyText}</pre>\n` +
    `<p style="color:#64748b;font-size:12px">Sent by ${vars.admin_name}</p>\n` +
    `</div>`;

  await sendEmail({ to: customerEmail, subject: finalSubject, html, text: bodyText });

  reminder.lastSentAt = new Date();
  await reminder.save();

  return { reminderId: reminder._id, sentTo: customerEmail, at: reminder.lastSentAt };
};

