import express from 'express';
import { partialPaymentsController } from './partial-payments.controller';
import { validateData } from '../../middlewares';
import { CreateExpectationSchema } from './partial-payments.types';

const partialPaymentsRoute = express.Router();

/**
 * @openapi
 * /payment-expectations:
 *   post:
 *     tags:
 *       - Payment Expectations
 *     summary: Declare a new payment expectation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reference
 *               - accountId
 *               - expectedAmount
 *             properties:
 *               reference:
 *                 type: string
 *                 example: "ORDER-2026-991A"
 *               accountId:
 *                 type: string
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               expectedAmount:
 *                 type: integer
 *                 description: Amount expected in kobo (e.g. 150000 = 1500 Naira)
 *                 example: 150000
 *     responses:
 *       "201":
 *         description: Expectation registered successfully
 *       "400":
 *         description: Validation failed or duplicate reference
 *   get:
 *     tags:
 *       - Payment Expectations
 *     summary: List all payment expectations
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PARTIAL, COMPLETE, OVERPAID]
 *         description: Filter expectations by status
 *     responses:
 *       "200":
 *         description: List of payment expectations
 */
partialPaymentsRoute.route('/')
  .post(validateData(CreateExpectationSchema), partialPaymentsController.createExpectation)
  .get(partialPaymentsController.listExpectations);

/**
 * @openapi
 * /payment-expectations/{id}:
 *   get:
 *     tags:
 *       - Payment Expectations
 *     summary: Get payment expectation details with installments
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
 *         description: Payment expectation details
 *       "404":
 *         description: Expectation not found
 */
partialPaymentsRoute.get('/:id', partialPaymentsController.getExpectation);

/**
 * @openapi
 * /payment-expectations/{id}/installments:
 *   get:
 *     tags:
 *       - Payment Expectations
 *     summary: Get all installments for an expectation
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
 *         description: List of installments
 *       "404":
 *         description: Expectation not found
 */
partialPaymentsRoute.get('/:id/installments', partialPaymentsController.getInstallments);

export { partialPaymentsRoute };
