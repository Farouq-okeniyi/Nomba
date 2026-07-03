import express from 'express';
import { merchantsController } from './merchants.controller';
import { validateData, authMiddleware } from '../../middlewares';
import { RegisterMerchantSchema, GenerateKeySchema, UpdateWebhookSchema } from './merchants.types';

const merchantsRoute = express.Router();

/**
 * @openapi
 * /merchants/register:
 *   post:
 *     tags:
 *       - Merchants
 *     summary: Register a new merchant and get initial API key
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - businessName
 *               - email
 *             properties:
 *               businessName:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       "201":
 *         description: Merchant registered
 */
merchantsRoute.post('/register', validateData(RegisterMerchantSchema), merchantsController.register);

// Protected routes
merchantsRoute.use(authMiddleware);

/**
 * @openapi
 * /merchants/keys/regenerate:
 *   post:
 *     tags:
 *       - Merchants
 *     summary: Regenerate API key (invalidates old key immediately)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: New API key generated
 */
merchantsRoute.post('/keys/regenerate', merchantsController.regenerateKey);

/**
 * @openapi
 * /merchants/webhook:
 *   put:
 *     tags:
 *       - Merchants
 *     summary: Update merchant webhook URL
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - webhookUrl
 *             properties:
 *               webhookUrl:
 *                 type: string
 *     responses:
 *       "200":
 *         description: Webhook URL updated
 */
merchantsRoute.put('/webhook', validateData(UpdateWebhookSchema), merchantsController.updateWebhookUrl);

export { merchantsRoute };
