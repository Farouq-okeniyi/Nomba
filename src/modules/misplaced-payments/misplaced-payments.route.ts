import express from 'express';
import { misplacedPaymentsController } from './misplaced-payments.controller';
import { validateData } from '../../middlewares';
import { UpdateMisplacedPaymentSchema, RecoverMisplacedPaymentSchema } from './misplaced-payments.types';

const misplacedPaymentsRoute = express.Router();

/**
 * @openapi
 * /misplaced-payments:
 *   get:
 *     tags:
 *       - Misplaced Payments
 *     summary: List all misplaced/unmatched payments
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
 * /misplaced-payments/{id}/hold:
 *   patch:
 *     tags:
 *       - Misplaced Payments
 *     summary: Mark misplaced payment as HELD under review
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
 *               - notes
 *               - resolvedBy
 *             properties:
 *               notes:
 *                 type: string
 *                 example: "Need to wait for client receipt confirmation"
 *               resolvedBy:
 *                 type: string
 *                 example: "Admin_Jack"
 *     responses:
 *       "200":
 *         description: Status updated to HELD
 */
misplacedPaymentsRoute.patch('/:id/hold', validateData(UpdateMisplacedPaymentSchema), misplacedPaymentsController.holdPayment);

/**
 * @openapi
 * /misplaced-payments/{id}/recover:
 *   patch:
 *     tags:
 *       - Misplaced Payments
 *     summary: Resolve payment by matching/recovering to a customer or expectation
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
 *               - notes
 *               - resolvedBy
 *             properties:
 *               notes:
 *                 type: string
 *                 example: "Assigned manually to reference ORDER-2026-X"
 *               resolvedBy:
 *                 type: string
 *                 example: "Admin_Jack"
 *               targetExpectationReference:
 *                 type: string
 *                 example: "ORDER-2026-X"
 *     responses:
 *       "200":
 *         description: Status updated to RECOVERED and expectation updated
 */
misplacedPaymentsRoute.patch('/:id/recover', validateData(RecoverMisplacedPaymentSchema), misplacedPaymentsController.recoverPayment);

/**
 * @openapi
 * /misplaced-payments/{id}/refund:
 *   patch:
 *     tags:
 *       - Misplaced Payments
 *     summary: Initiate transfer refund back to sender via Nomba Payout Transfer
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
 *               - notes
 *               - resolvedBy
 *             properties:
 *               notes:
 *                 type: string
 *                 example: "Customer requested refund due to wrong account transfer"
 *               resolvedBy:
 *                 type: string
 *                 example: "Admin_Jack"
 *     responses:
 *       "200":
 *         description: Refund processed and status updated to REFUNDED
 */
misplacedPaymentsRoute.patch('/:id/refund', validateData(UpdateMisplacedPaymentSchema), misplacedPaymentsController.refundPayment);

export { misplacedPaymentsRoute };
