import express from 'express';
import { merchantsController } from './merchants.controller';
import { validateData, authMiddleware } from '../../middlewares';
import { RegisterMerchantSchema, RegenerateKeySchema, UpdateWebhookSchema } from './merchants.validation';

const merchantsRoute = express.Router();

// Public routes
merchantsRoute.post('/register', validateData(RegisterMerchantSchema), merchantsController.register);
merchantsRoute.post('/keys/regenerate', validateData(RegenerateKeySchema), merchantsController.regenerateKey);

// Protected routes — require valid API key
merchantsRoute.use(authMiddleware);

merchantsRoute.put('/webhook', validateData(UpdateWebhookSchema), merchantsController.updateWebhookUrl);

export { merchantsRoute };
