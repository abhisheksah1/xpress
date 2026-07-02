import * as couponService from '../../services/coupon.service.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

export const validateCoupon = asyncHandler(async (req, res) => {
  const result = await couponService.validateCouponForCheckout({
    ...req.validated.body,
    userId: req.user?._id,
  });
  res.json(new ApiResponse(200, result));
});

export const checkoutQuote = asyncHandler(async (req, res) => {
  const result = await couponService.validateCouponForCheckout({
    ...req.validated.body,
    userId: req.user?._id,
  });
  res.json(new ApiResponse(200, result));
});
