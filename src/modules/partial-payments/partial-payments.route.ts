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
 *       - Payment Expectations (Partial Payments)
 *     summary: Declare a new payment expectation
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - reference
 *               - customerId
 *               - expectedAmount
 *             properties:
 *               reference:
 *                 type: string
 *                 example: "ORDER-2026-991A"
 *               customerId:
 *                 type: string
 *                 example: "CUST-9908"
 *               expectedAmount:
 *                 type: integer
 *                 description: Amount expected in kobo (e.g. 150000 = 1500 Naira)
 *                 example: 150000
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 example: "2026-08-30T12:00:00Z"
 *     responses:
 *       "201":
 *         description: Expectation registered successfully
 *       "400":
 *         description: Validation failed or duplicate reference
 *   get:
 *     tags:
 *       - Payment Expectations (Partial Payments)
 *     summary: List all payment expectations
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
 *       - Payment Expectations (Partial Payments)
 *     summary: Get payment expectation details with installments
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
 *       - Payment Expectations (Partial Payments)
 *     summary: Get all installments for an expectation
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
