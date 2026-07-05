import express from 'express';
import { transactionsController } from './transactions.controller';
import { authMiddleware } from '../../middlewares';

const transactionsRoute = express.Router();

// Protected routes
transactionsRoute.use(authMiddleware);

/**
 * @openapi
 * /accounts/{accountId}/transactions:
 *   get:
 *     tags: [Transactions]
 *     summary: List all transactions for an account
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
transactionsRoute.get('/accounts/:accountId/transactions', transactionsController.listByAccount);

/**
 * @openapi
 * /accounts/{accountId}/statement:
 *   get:
 *     tags: [Transactions]
 *     summary: Generate a transaction statement
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *     responses:
 *       200:
 *         description: Success
 */
transactionsRoute.get('/accounts/:accountId/statement', transactionsController.getStatement);

/**
 * @openapi
 * /transactions/{merchantTxRef}:
 *   get:
 *     tags: [Transactions]
 *     summary: Get a transaction by merchant reference
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantTxRef
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Success
 */
transactionsRoute.get('/transactions/:merchantTxRef', transactionsController.getByMerchantRef);

/**
 * @swagger
 * /statements:
 *   get:
 *     summary: Get merchant-level statement
 *     description: Returns all transactions across all virtual accounts under the authenticated merchant
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *         description: Filter from date (ISO 8601)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *         description: Filter to date (ISO 8601)
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *         description: Response format (default json)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Results per page (default 50)
 *     responses:
 *       200:
 *         description: Merchant statement
 *       401:
 *         description: Unauthorized
 */
transactionsRoute.get('/statements', transactionsController.getMerchantStatement);

export { transactionsRoute };
