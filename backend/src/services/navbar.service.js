import { Navbar } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';

export const getNavbars = async (location, { includeInactive = false } = {}) => {
  const filter = {};
  if (!includeInactive) filter.isActive = true;
  if (location) filter.location = location;
  return Navbar.find(filter).sort({ name: 1 });
};

export const getNavbarById = async (id) => {
  const navbar = await Navbar.findById(id);
  if (!navbar) throw new ApiError(404, 'Navbar not found');
  return navbar;
};

export const createNavbar = async (data, userId) => {
  return Navbar.create({ ...data, updatedBy: userId });
};

export const updateNavbar = async (id, data, userId) => {
  const navbar = await Navbar.findByIdAndUpdate(
    id,
    { ...data, updatedBy: userId },
    { new: true, runValidators: true }
  );
  if (!navbar) throw new ApiError(404, 'Navbar not found');
  return navbar;
};

export const deleteNavbar = async (id) => {
  const navbar = await Navbar.findByIdAndDelete(id);
  if (!navbar) throw new ApiError(404, 'Navbar not found');
};

export const updateNavItems = async (id, items, userId) => {
  const navbar = await Navbar.findById(id);
  if (!navbar) throw new ApiError(404, 'Navbar not found');
  navbar.items = items;
  navbar.updatedBy = userId;
  await navbar.save();
  return navbar;
};
