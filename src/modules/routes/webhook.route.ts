import express from 'express';
import { webhookController } from '../webhook/webhook.controller';
import { verifyWebhookSignature } from '../../middlewares';

// Swagger docs → src/config/swagger/webhooks.swagger.ts

const webhookRoute = express.Router();

webhookRoute.post('/nomba', verifyWebhookSignature, webhookController.receiveWebhook);

export { webhookRoute };
