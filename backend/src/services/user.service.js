import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../config/constants.js';

export const getAllUsers = async ({ page = 1, limit = 20, role, search, isActive }) => {
  const filter = { role: { $in: [ROLES.CUSTOMER] } };
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive === 'true';
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    users: users.map((u) => u.toSafeObject()),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');
  return user.toSafeObject();
};

export const updateUser = async (id, data) => {
  const user = await User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!user) throw new ApiError(404, 'User not found');
  return user.toSafeObject();
};

export const toggleUserStatus = async (id) => {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.role === ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Cannot deactivate super admin');
  }
  user.isActive = !user.isActive;
  await user.save();
  return user.toSafeObject();
};

export const deleteUser = async (id) => {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user.role === ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Cannot delete super admin');
  }
  await user.deleteOne();
};
