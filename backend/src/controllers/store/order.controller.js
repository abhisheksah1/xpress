import * as orderService from '../../services/order.service.js';
import * as paymentService from '../../services/payment.service.js';
import * as deliveryService from '../../services/delivery.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { PAYMENT_METHODS } from '../../config/constants.js';

export const createOrder = asyncHandler(async (req, res) => {
  const body = req.validated.body;
  const orderData = {
    ...body,
    userId: req.user?._id,
    guestEmail: body.guestEmail || body.sender?.email || body.shippingAddress?.email,
    guestPhone: body.guestPhone || (body.sender ? `${body.sender.countryCode || ''}${body.sender.phone}` : body.shippingAddress?.phone),
  };

  const order = await orderService.createOrder(orderData);

  if (orderData.paymentMethod === PAYMENT_METHODS.COD) {
    return res.status(201).json(new ApiResponse(201, { order }, 'Order placed (COD)'));
  }

  if (orderData.paymentMethod === PAYMENT_METHODS.MANUAL_BANK) {
    return res.status(201).json(
      new ApiResponse(201, { order }, 'Order placed — complete your bank transfer to pay')
    );
  }

  const payment = await paymentService.initiatePayment(order, orderData.paymentMethod);
  res.status(201).json(new ApiResponse(201, { order, payment }, 'Order created'));
});

export const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId, method, ...verificationData } = req.body;
  const order = await paymentService.verifyAndCompletePayment(orderId, method, verificationData);
  res.json(new ApiResponse(200, order, 'Payment verified'));
});

export const getMyOrders = asyncHandler(async (req, res) => {
  await orderService.linkGuestOrdersToUser(req.user._id, req.user.email);
  const result = await orderService.getOrders({
    ...req.query,
    userId: req.user._id,
    excludeLeads: true,
  });
  res.json(new ApiResponse(200, result));
});

export const getMyOrder = asyncHandler(async (req, res) => {
  await orderService.linkGuestOrdersToUser(req.user._id, req.user.email);
  const order = await orderService.getOrderById(req.params.id, req.user._id);
  res.json(new ApiResponse(200, order));
});

export const trackOrder = asyncHandler(async (req, res) => {
  const { orderNumber, email } = req.query;
  const order = await orderService.getOrderByNumber(orderNumber, email);
  res.json(new ApiResponse(200, order));
});

export const getDeliveryLocations = asyncHandler(async (req, res) => {
  const locations = await deliveryService.getDeliveryLocations();
  res.json(new ApiResponse(200, locations));
});

export const getDeliveryZones = asyncHandler(async (req, res) => {
  const groups = await deliveryService.getDeliveryGroups();
  res.json(new ApiResponse(200, groups));
});
