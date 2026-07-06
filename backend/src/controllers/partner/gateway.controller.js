import { asyncHandler } from '../../utils/asyncHandler.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import * as gateway from '../../services/apiPartnerGateway.service.js';

export const getDeliveryLocations = asyncHandler(async (req, res) => {
  const data = await gateway.getPartnerDeliveryLocations(req.apiPartner);
  res.json(new ApiResponse(200, data));
});

export const searchProducts = asyncHandler(async (req, res) => {
  const data = await gateway.searchPartnerProducts(req.apiPartner, {
    deliveryLocationId: req.query.deliveryLocationId,
    deliveryDate: req.query.deliveryDate,
    q: req.query.q,
  });
  res.json(new ApiResponse(200, data));
});

export const getQuote = asyncHandler(async (req, res) => {
  const data = await gateway.buildPartnerQuote(req.apiPartner, req.validated.body);
  res.json(new ApiResponse(200, data));
});

export const createOrder = asyncHandler(async (req, res) => {
  const data = await gateway.createPartnerOrder(req.apiPartner, req.validated.body);
  res.status(201).json(new ApiResponse(201, data, 'Order created — pending payment'));
});

export const lookupOrder = asyncHandler(async (req, res) => {
  const data = await gateway.lookupPartnerOrderForPayment(req.apiPartner, req.params.orderNumber, {
    receiverName: req.query.receiverName,
    receiverMobile: req.query.receiverMobile,
  });
  res.json(new ApiResponse(200, data));
});

export const confirmPayment = asyncHandler(async (req, res) => {
  const data = await gateway.confirmPartnerOrderPayment(
    req.apiPartner,
    req.params.orderNumber,
    req.validated.body
  );
  res.json(new ApiResponse(200, data, 'Payment confirmed'));
});

export const getManualPaymentInstructions = asyncHandler(async (req, res) => {
  const data = await gateway.getManualPaymentInstructions();
  res.json(new ApiResponse(200, data));
});
