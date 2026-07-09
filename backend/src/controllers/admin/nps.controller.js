import config from '../../config/index.js';
import * as npsService from '../../services/payments/nps.service.js';
import * as paymentGatewayService from '../../services/paymentGateway.service.js';
import { ApiError } from '../../utils/ApiError.js';
import { ApiResponse } from '../../utils/ApiResponse.js';
import { asyncHandler } from '../../utils/asyncHandler.js';

const resolveNpsRequest = async (body = {}) => {
  const gateway = await paymentGatewayService.getGatewayById('card');
  const creds = {
    merchantId: body.merchantId || gateway?.credentials?.merchantId,
    merchantName: body.merchantName || gateway?.credentials?.merchantName,
    secretKey: body.secretKey || gateway?.credentials?.secretKey,
    apiUsername: body.apiUsername || gateway?.credentials?.apiUsername,
    apiPassword: body.apiPassword || gateway?.credentials?.apiPassword,
    instrumentCode: body.instrumentCode || gateway?.credentials?.instrumentCode || '',
  };
  const env = body.environment || gateway?.environment || config.payments?.nps?.environment || 'sandbox';
  return { creds, env };
};

export const getNpsUrls = asyncHandler(async (req, res) => {
  const serverBase = String(config.serverUrl).replace(/\/$/, '');
  const apiBase = `${serverBase}/api/${config.apiVersion}`;
  const notificationUrl = `${apiBase}/store/payments/nps/notify`;
  const responseUrl = `${String(config.clientUrl).replace(/\/$/, '')}/checkout/card/callback`;
  const isLocalNotification = /localhost|127\.0\.0\.1/i.test(notificationUrl);

  res.json(
    new ApiResponse(200, {
      notificationUrl,
      responseUrl,
      localDevWarning: isLocalNotification
        ? 'NPS cannot reach localhost for server notifications. Use ngrok (or similar), set SERVER_URL to the public HTTPS URL, and register that notification URL with NPS.'
        : null,
      sandboxApi: 'https://apisandbox.nepalpayment.com',
      sandboxGateway: 'https://gatewaysandbox.nepalpayment.com/Payment/Index',
      productionApi: 'https://apigateway.nepalpayment.com',
      productionGateway: 'https://gateway.nepalpayment.com/payment/index',
    })
  );
});

export const testNpsConnection = asyncHandler(async (req, res) => {
  const { creds, env } = await resolveNpsRequest(req.body);
  const result = await npsService.testConnection(creds, env);
  res.json(new ApiResponse(200, result, 'NPS OnePG connection successful'));
});

export const getNpsInstruments = asyncHandler(async (req, res) => {
  const { creds, env } = await resolveNpsRequest(req.body);
  const instruments = await npsService.getPaymentInstruments(creds, env);
  res.json(new ApiResponse(200, instruments));
});

export const getNpsServiceCharge = asyncHandler(async (req, res) => {
  const { amount, instrumentCode } = req.body;
  if (!amount || !instrumentCode) {
    throw new ApiError(400, 'amount and instrumentCode are required');
  }
  const { creds, env } = await resolveNpsRequest(req.body);
  const charge = await npsService.getServiceCharge({ amount, instrumentCode }, creds, env);
  res.json(new ApiResponse(200, charge));
});
