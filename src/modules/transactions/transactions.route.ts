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

export { transactionsRoute };
