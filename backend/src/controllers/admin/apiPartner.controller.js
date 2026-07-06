import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as apiPartnerService from '../../services/apiPartner.service.js';
import config from '../../config/index.js';

export const listPartners = asyncHandler(async (req, res) => {
  const data = await apiPartnerService.listPartners(req.query);
  res.json(new ApiResponse(200, data));
});

export const getPartner = asyncHandler(async (req, res) => {
  const data = await apiPartnerService.getPartnerById(req.params.id);
  res.json(new ApiResponse(200, data));
});

export const createPartner = asyncHandler(async (req, res) => {
  const data = await apiPartnerService.createPartner(req.validated.body, req.user._id);
  res.status(201).json(new ApiResponse(201, data, 'API partner created'));
});

export const updatePartner = asyncHandler(async (req, res) => {
  const data = await apiPartnerService.updatePartner(req.params.id, req.validated.body);
  res.json(new ApiResponse(200, data, 'API partner updated'));
});

export const deletePartner = asyncHandler(async (req, res) => {
  await apiPartnerService.deletePartner(req.params.id);
  res.json(new ApiResponse(200, null, 'API partner deleted'));
});

export const resetCredentials = asyncHandler(async (req, res) => {
  const data = await apiPartnerService.resetPartnerCredentials(req.params.id);
  res.json(new ApiResponse(200, data, 'API credentials reset'));
});

export const getLogs = asyncHandler(async (req, res) => {
  const data = await apiPartnerService.getPartnerLogs(req.params.id, req.query);
  res.json(new ApiResponse(200, data));
});

export const downloadDocumentation = asyncHandler(async (req, res) => {
  const partner = await apiPartnerService.getPartnerById(req.params.id);
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const markdown = apiPartnerService.buildPartnerDocumentation(partner, baseUrl);
  const filename = `${partner.apiUsername}-api-docs.md`;
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(markdown);
});

export const previewDocumentation = asyncHandler(async (req, res) => {
  const partner = await apiPartnerService.getPartnerById(req.params.id);
  const baseUrl = config.clientUrl || `${req.protocol}://${req.get('host')}`;
  const markdown = apiPartnerService.buildPartnerDocumentation(partner, baseUrl);
  res.json(new ApiResponse(200, { markdown }));
});
