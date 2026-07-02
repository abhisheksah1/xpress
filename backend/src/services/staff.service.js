import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES, STAFF_PERMISSIONS } from '../config/constants.js';

export const createStaff = async (data, createdBy) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) throw new ApiError(409, 'Email already exists');

  const permissions = data.permissions?.filter((p) => STAFF_PERMISSIONS.includes(p)) || [];

  const staff = await User.create({
    ...data,
    role: data.role === ROLES.ADMIN ? ROLES.ADMIN : ROLES.STAFF,
    permissions,
    createdBy,
  });

  return staff.toSafeObject();
};

export const getAllStaff = async ({ page = 1, limit = 20, search }) => {
  const filter = { role: { $in: [ROLES.ADMIN, ROLES.STAFF] } };
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }

  const skip = (page - 1) * limit;
  const [staff, total] = await Promise.all([
    User.find(filter).populate('createdBy', 'name email').sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    staff: staff.map((s) => s.toSafeObject()),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
};

export const updateStaff = async (id, data, requesterRole) => {
  const staff = await User.findById(id);
  if (!staff) throw new ApiError(404, 'Staff not found');
  if (staff.role === ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Cannot modify super admin');
  }
  if (requesterRole !== ROLES.SUPER_ADMIN && staff.role === ROLES.ADMIN) {
    throw new ApiError(403, 'Only super admin can modify admins');
  }

  const allowed = ['name', 'phone', 'permissions', 'isActive'];
  if (data.password) allowed.push('password');
  if (requesterRole === ROLES.SUPER_ADMIN && data.role) allowed.push('role');

  for (const key of allowed) {
    if (data[key] !== undefined) staff[key] = data[key];
  }

  if (data.permissions) {
    staff.permissions = data.permissions.filter((p) => STAFF_PERMISSIONS.includes(p));
  }

  await staff.save();
  return staff.toSafeObject();
};

export const deleteStaff = async (id) => {
  const staff = await User.findById(id);
  if (!staff) throw new ApiError(404, 'Staff not found');
  if ([ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(staff.role)) {
    throw new ApiError(403, 'Cannot delete admin or super admin via this endpoint');
  }
  await staff.deleteOne();
};
