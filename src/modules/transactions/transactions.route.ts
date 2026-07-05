import express from 'express';
import { transactionsController } from './transactions.controller';
import { authMiddleware } from '../../middlewares';

// Swagger docs → src/config/swagger/transactions.swagger.ts

const transactionsRoute = express.Router();

// All transaction routes require authentication
transactionsRoute.use(authMiddleware);

transactionsRoute.get('/accounts/:accountId/transactions', transactionsController.listByAccount);
transactionsRoute.get('/accounts/:accountId/statement',   transactionsController.getStatement);
transactionsRoute.get('/transactions/:merchantTxRef',     transactionsController.getByMerchantRef);
transactionsRoute.get('/statements',                      transactionsController.getMerchantStatement);

export { transactionsRoute };
