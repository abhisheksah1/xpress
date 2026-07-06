import { Router } from 'express';
import * as gatewayController from '../controllers/partner/gateway.controller.js';
import { authenticateApiPartner, partnerRateLimit } from '../middlewares/apiPartner.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { partnerQuoteSchema, partnerCreateOrderSchema, partnerPaymentConfirmSchema } from '../validators/index.js';

const router = Router();

router.use(authenticateApiPartner, partnerRateLimit);

router.get('/delivery-locations', gatewayController.getDeliveryLocations);
router.get('/products', gatewayController.searchProducts);
router.post('/quote', validate(partnerQuoteSchema), gatewayController.getQuote);
router.post('/orders', validate(partnerCreateOrderSchema), gatewayController.createOrder);
router.get('/orders/:orderNumber/lookup', gatewayController.lookupOrder);
router.post('/orders/:orderNumber/payment-confirm', validate(partnerPaymentConfirmSchema), gatewayController.confirmPayment);
router.get('/manual-payment-instructions', gatewayController.getManualPaymentInstructions);

export default router;
