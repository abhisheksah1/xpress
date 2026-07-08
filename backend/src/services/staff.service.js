import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import {
  ROLES,
  STAFF_PERMISSIONS,
  STAFF_ROLE_PRESETS,
  STAFF_PERMISSION_LABELS,
} from '../config/constants.js';

export const getStaffMeta = () => ({
  permissions: STAFF_PERMISSIONS.map((key) => ({
    key,
    label: STAFF_PERMISSION_LABELS[key] || key,
  })),
  presets: Object.entries(STAFF_ROLE_PRESETS).map(([id, preset]) => ({
    id,
    ...preset,
  })),
  roles: [
    { value: ROLES.STAFF, label: 'Custom staff (selected privileges)' },
    { value: ROLES.ADMIN, label: 'Admin (full access, cannot manage super admin)' },
  ],
});

export const createStaff = async (data, createdBy, requesterRole) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) throw new ApiError(409, 'Email already exists');

  let role = ROLES.STAFF;
  if (data.role === ROLES.ADMIN) {
    if (requesterRole !== ROLES.SUPER_ADMIN) {
      throw new ApiError(403, 'Only super admin can create admin users');
    }
    role = ROLES.ADMIN;
  }

  const permissions = role === ROLES.ADMIN
    ? []
    : (data.permissions?.filter((p) => STAFF_PERMISSIONS.includes(p)) || []);

  if (role === ROLES.STAFF && !permissions.length) {
    throw new ApiError(400, 'Select at least one privilege for staff users');
  }

  const staff = await User.create({
    name: data.name,
    email: data.email,
    phone: data.phone,
    password: data.password,
    role,
    permissions,
    createdBy,
  });

  return staff.toSafeObject();
};

export const getAllStaff = async ({ page = 1, limit = 20, search, requesterRole }) => {
  const roleFilter = requesterRole === ROLES.SUPER_ADMIN
    ? { $in: [ROLES.ADMIN, ROLES.STAFF] }
    : ROLES.STAFF;

  const filter = { role: roleFilter };
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
    throw new ApiError(403, 'Only super admin can modify admin users');
  }

  const allowed = ['name', 'phone', 'permissions', 'isActive'];
  if (data.password) allowed.push('password');

  if (requesterRole === ROLES.SUPER_ADMIN && data.role) {
    if (data.role === ROLES.SUPER_ADMIN) {
      throw new ApiError(403, 'Cannot promote users to super admin');
    }
    if ([ROLES.ADMIN, ROLES.STAFF].includes(data.role)) {
      staff.role = data.role;
      if (data.role === ROLES.ADMIN) {
        staff.permissions = [];
      }
    }
  }

  for (const key of allowed) {
    if (data[key] !== undefined) staff[key] = data[key];
  }

  if (staff.role === ROLES.STAFF && data.permissions) {
    staff.permissions = data.permissions.filter((p) => STAFF_PERMISSIONS.includes(p));
    if (!staff.permissions.length) {
      throw new ApiError(400, 'Staff users need at least one privilege');
    }
  }

  await staff.save();
  return staff.toSafeObject();
};

export const deleteStaff = async (id, requesterRole) => {
  const staff = await User.findById(id);
  if (!staff) throw new ApiError(404, 'Staff not found');
  if (staff.role === ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Cannot delete super admin');
  }
  if (staff.role === ROLES.ADMIN && requesterRole !== ROLES.SUPER_ADMIN) {
    throw new ApiError(403, 'Only super admin can delete admin users');
  }
  await staff.deleteOne();
};
