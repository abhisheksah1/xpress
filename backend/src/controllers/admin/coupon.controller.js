import * as couponService from '../../services/coupon.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const getCoupons = asyncHandler(async (req, res) => {
  const result = await couponService.getCoupons(req.query);
  res.json(new ApiResponse(200, result));
});

export const getCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.getCouponById(req.params.id);
  res.json(new ApiResponse(200, coupon));
});

export const createCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.createCoupon(req.validated?.body || req.body, req.user._id);
  res.status(201).json(new ApiResponse(201, coupon, 'Coupon created'));
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await couponService.updateCoupon(req.params.id, req.validated?.body || req.body, req.user._id);
  res.json(new ApiResponse(200, coupon, 'Coupon updated'));
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  await couponService.deleteCoupon(req.params.id);
  res.json(new ApiResponse(200, null, 'Coupon deleted'));
});

export const getCouponUsageReport = asyncHandler(async (req, res) => {
  const report = await couponService.getCouponUsageReport({
    from: req.query.from,
    to: req.query.to,
  });
  res.json(new ApiResponse(200, report));
});
