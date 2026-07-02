import express from 'express';
import { disbursementsController } from './disbursements.controller';
import { validateData } from '../../middlewares';
import { CreateDisbursementSchema } from './disbursements.types';

const disbursementsRoute = express.Router();

/**
 * @openapi
 * /disbursements:
 *   post:
 *     tags:
 *       - Bulk Disbursements
 *     summary: Create and execute a bulk disbursement batch
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - label
 *               - items
 *             properties:
 *               label:
 *                 type: string
 *                 example: "Staff Salaries June 2026"
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - recipientName
 *                     - accountNumber
 *                     - bankCode
 *                     - amount
 *                   properties:
 *                     recipientName:
 *                       type: string
 *                       example: "Alice Johnson"
 *                     accountNumber:
 *                       type: string
 *                       example: "0123456789"
 *                     bankCode:
 *                       type: string
 *                       example: "058"
 *                     amount:
 *                       type: integer
 *                       description: Amount in kobo
 *                       example: 500000
 *     responses:
 *       "201":
 *         description: Batch created and processing executed
 *       "400":
 *         description: Validation failed or insufficient balance
 *   get:
 *     tags:
 *       - Bulk Disbursements
 *     summary: List all disbursement batches
 *     responses:
 *       "200":
 *         description: List of disbursement batches
 */
disbursementsRoute.route('/')
  .post(validateData(CreateDisbursementSchema), disbursementsController.createBatch)
  .get(disbursementsController.listBatches);

/**
 * @openapi
 * /disbursements/{id}:
 *   get:
 *     tags:
 *       - Bulk Disbursements
 *     summary: Get batch details with recipient items
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: Batch details
 *       "404":
 *         description: Batch not found
 */
disbursementsRoute.get('/:id', disbursementsController.getBatch);

/**
 * @openapi
 * /disbursements/{id}/retry-failed:
 *   post:
 *     tags:
 *       - Bulk Disbursements
 *     summary: Retry failed items in a disbursement batch
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       "200":
 *         description: Retried failed transfers
 *       "400":
 *         description: No failed items or batch already fully completed
 *       "404":
 *         description: Batch not found
 */
disbursementsRoute.post('/:id/retry-failed', disbursementsController.retryFailed);

export { disbursementsRoute };
