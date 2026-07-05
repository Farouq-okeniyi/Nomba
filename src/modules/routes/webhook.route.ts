import express from 'express';
import { webhookController } from '../webhook/webhook.controller';
import { verifyWebhookSignature } from '../../middlewares';

const webhookRoute = express.Router();

/**
 * @openapi
 * /webhooks/nomba:
 *   post:
 *     tags:
 *       - Webhooks
 *     summary: Receive Nomba payment event
 *     parameters:
 *       - in: header
 *         name: nomba-signature
 *         required: true
 *         schema:
 *           type: string
 *         description: HMAC-SHA256 signature of the raw request body using the Nomba webhook signing key
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Webhook payload event
 *     responses:
 *       "200":
 *         description: Event acknowledged
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookAckResponse'
 *       "400":
 *         description: Invalid payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       "401":
 *         description: Missing or invalid signature headers
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       "500":
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
webhookRoute.post('/nomba', verifyWebhookSignature, webhookController.receiveWebhook);

export { webhookRoute };
