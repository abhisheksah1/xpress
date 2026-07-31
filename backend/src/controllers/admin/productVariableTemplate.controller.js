import * as templateService from '../../services/productVariableTemplate.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const listTemplates = asyncHandler(async (req, res) => {
  const includeInactive = req.query.includeInactive === 'true' || req.query.includeInactive === '1';
  const templates = await templateService.listTemplates({ includeInactive });
  res.json(new ApiResponse(200, templates));
});

export const getTemplate = asyncHandler(async (req, res) => {
  const template = await templateService.getTemplateById(req.params.id);
  res.json(new ApiResponse(200, template));
});

export const createTemplate = asyncHandler(async (req, res) => {
  const template = await templateService.createTemplate(req.body, req.user._id);
  res.status(201).json(new ApiResponse(201, template, 'Variable preset saved'));
});

export const updateTemplate = asyncHandler(async (req, res) => {
  const template = await templateService.updateTemplate(req.params.id, req.body);
  res.json(new ApiResponse(200, template, 'Variable preset updated'));
});

export const deleteTemplate = asyncHandler(async (req, res) => {
  await templateService.deleteTemplate(req.params.id);
  res.json(new ApiResponse(200, null, 'Variable preset deleted'));
});
