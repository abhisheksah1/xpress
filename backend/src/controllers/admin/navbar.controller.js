import * as navbarService from '../../services/navbar.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const createNavbar = asyncHandler(async (req, res) => {
  const navbar = await navbarService.createNavbar(req.body, req.user._id);
  res.status(201).json(new ApiResponse(201, navbar, 'Navbar created'));
});

export const getNavbars = asyncHandler(async (req, res) => {
  const navbars = await navbarService.getNavbars(req.query.location);
  res.json(new ApiResponse(200, navbars));
});

export const getNavbar = asyncHandler(async (req, res) => {
  const navbar = await navbarService.getNavbarById(req.params.id);
  res.json(new ApiResponse(200, navbar));
});

export const updateNavbar = asyncHandler(async (req, res) => {
  const navbar = await navbarService.updateNavbar(req.params.id, req.body, req.user._id);
  res.json(new ApiResponse(200, navbar, 'Navbar updated'));
});

export const updateNavItems = asyncHandler(async (req, res) => {
  const navbar = await navbarService.updateNavItems(req.params.id, req.body.items, req.user._id);
  res.json(new ApiResponse(200, navbar, 'Nav items updated'));
});

export const deleteNavbar = asyncHandler(async (req, res) => {
  await navbarService.deleteNavbar(req.params.id);
  res.json(new ApiResponse(200, null, 'Navbar deleted'));
});
