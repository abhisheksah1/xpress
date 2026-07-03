import * as reminderService from '../../services/reminder.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getReminders = asyncHandler(async (req, res) => {
  const result = await reminderService.adminListReminders(req.query);
  res.json(new ApiResponse(200, result));
});

export const sendReminder = asyncHandler(async (req, res) => {
  const result = await reminderService.adminSendReminder(
    { reminderId: req.params.id, subject: req.body.subject, message: req.body.message },
    req.user
  );
  res.json(new ApiResponse(200, result, 'Reminder sent'));
});

export const whatsAppReminder = asyncHandler(async (req, res) => {
  const result = await reminderService.adminWhatsAppReminder(
    { reminderId: req.params.id, message: req.body.message },
    req.user
  );
  res.json(new ApiResponse(200, result, 'WhatsApp link ready'));
});

