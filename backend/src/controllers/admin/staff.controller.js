import * as staffService from '../../services/staff.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getStaffMeta = asyncHandler(async (req, res) => {
  res.json(new ApiResponse(200, staffService.getStaffMeta()));
});

export const createStaff = asyncHandler(async (req, res) => {
  const staff = await staffService.createStaff(req.validated.body, req.user._id, req.user.role);
  res.status(201).json(new ApiResponse(201, staff, 'Team member created'));
});

export const getStaff = asyncHandler(async (req, res) => {
  const result = await staffService.getAllStaff({ ...req.query, requesterRole: req.user.role });
  res.json(new ApiResponse(200, result));
});

export const updateStaff = asyncHandler(async (req, res) => {
  const staff = await staffService.updateStaff(req.params.id, req.body, req.user.role);
  res.json(new ApiResponse(200, staff, 'Team member updated'));
});

export const deleteStaff = asyncHandler(async (req, res) => {
  await staffService.deleteStaff(req.params.id, req.user.role);
  res.json(new ApiResponse(200, null, 'Team member removed'));
});
