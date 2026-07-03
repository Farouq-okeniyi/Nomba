import express from 'express';
import { misplacedPaymentsController } from './misplaced-payments.controller';
import { validateData } from '../../middlewares';
import { ResolveMisplacedPaymentSchema } from './misplaced-payments.types';

const misplacedPaymentsRoute = express.Router();

/**
 * @openapi
 * /misplaced-payments:
 *   get:
 *     tags:
 *       - Misplaced Payments
 *     summary: List all misplaced/unmatched payments (merchant-scoped)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       "200":
 *         description: List of misplaced payments
 */
misplacedPaymentsRoute.get('/', misplacedPaymentsController.listPayments);

/**
 * @openapi
 * /misplaced-payments/{id}:
 *   get:
 *     tags:
 *       - Misplaced Payments
 *     summary: Get misplaced payment details
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: Misplaced payment details
 *       "404":
 *         description: Record not found
 */
misplacedPaymentsRoute.get('/:id', misplacedPaymentsController.getPayment);

/**
 * @openapi
 * /misplaced-payments/{id}/resolve:
 *   post:
 *     tags:
 *       - Misplaced Payments
 *     summary: Resolve a misplaced payment (REROUTE | REFUND | WRITE_OFF)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - note
 *               - resolvedBy
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [REROUTE, REFUND, WRITE_OFF]
 *               note:
 *                 type: string
 *               resolvedBy:
 *                 type: string
 *               targetAccountId:
 *                 type: string
 *                 description: Required when action is REROUTE
 *     responses:
 *       "200":
 *         description: Payment resolved successfully
 */
misplacedPaymentsRoute.post('/:id/resolve', validateData(ResolveMisplacedPaymentSchema), misplacedPaymentsController.resolvePayment);

export { misplacedPaymentsRoute };
