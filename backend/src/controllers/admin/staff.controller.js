import * as staffService from '../../services/staff.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const createStaff = asyncHandler(async (req, res) => {
  const staff = await staffService.createStaff(req.validated.body, req.user._id);
  res.status(201).json(new ApiResponse(201, staff, 'Staff created'));
});

export const getStaff = asyncHandler(async (req, res) => {
  const result = await staffService.getAllStaff(req.query);
  res.json(new ApiResponse(200, result));
});

export const updateStaff = asyncHandler(async (req, res) => {
  const staff = await staffService.updateStaff(req.params.id, req.body, req.user.role);
  res.json(new ApiResponse(200, staff, 'Staff updated'));
});

export const deleteStaff = asyncHandler(async (req, res) => {
  await staffService.deleteStaff(req.params.id);
  res.json(new ApiResponse(200, null, 'Staff deleted'));
});
