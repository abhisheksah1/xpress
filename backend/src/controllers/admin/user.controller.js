import * as userService from '../../services/user.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getUsers = asyncHandler(async (req, res) => {
  const result = await userService.getAllUsers(req.query);
  res.json(new ApiResponse(200, result));
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  res.json(new ApiResponse(200, user));
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await userService.updateUser(req.params.id, req.body);
  res.json(new ApiResponse(200, user, 'User updated'));
});

export const toggleStatus = asyncHandler(async (req, res) => {
  const user = await userService.toggleUserStatus(req.params.id);
  res.json(new ApiResponse(200, user, 'User status toggled'));
});

export const deleteUser = asyncHandler(async (req, res) => {
  await userService.deleteUser(req.params.id);
  res.json(new ApiResponse(200, null, 'User deleted'));
});
