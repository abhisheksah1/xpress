import * as reminderService from '../../services/reminder.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getMyReminders = asyncHandler(async (req, res) => {
  const reminders = await reminderService.getMyReminders(req.user._id);
  res.json(new ApiResponse(200, reminders));
});

export const createReminder = asyncHandler(async (req, res) => {
  const reminder = await reminderService.createReminder(req.user._id, req.validated.body);
  res.status(201).json(new ApiResponse(201, reminder, 'Reminder created'));
});

export const updateReminder = asyncHandler(async (req, res) => {
  const reminder = await reminderService.updateMyReminder(req.user._id, req.params.id, req.validated.body);
  res.json(new ApiResponse(200, reminder, 'Reminder updated'));
});

export const deleteReminder = asyncHandler(async (req, res) => {
  await reminderService.deleteMyReminder(req.user._id, req.params.id);
  res.json(new ApiResponse(200, null, 'Reminder deleted'));
});

