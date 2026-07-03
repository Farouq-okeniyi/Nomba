import express from 'express';
import { webhookRoute } from './webhook.route';
import { accountsRoute } from '../accounts/accounts.route';
import { misplacedPaymentsRoute } from '../misplaced-payments/misplaced-payments.route';
import { partialPaymentsRoute } from '../partial-payments/partial-payments.route';
import { disbursementsRoute } from '../disbursements/disbursements.route';
import { merchantsRoute } from '../merchants/merchants.route';
import { transactionsRoute } from '../transactions/transactions.route';
import { authMiddleware } from '../../middlewares';

const router = express.Router();

const defaultRoutes = [
  {
    path: '/webhooks',
    route: webhookRoute,
    protected: false,
  },
  {
    path: '/merchants',
    route: merchantsRoute,
    protected: false, // Merchants route handles its own auth internally for sub-routes
  },
  {
    path: '/', // Mounted at root since route defines /accounts/:accountId and /transactions/:merchantTxRef
    route: transactionsRoute,
    protected: false, // Wait, transactionsRoute defines `transactionsRoute.use(authMiddleware)` inside it, so NO need to protect it here again.
  },
  {
    path: '/accounts',
    route: accountsRoute,
    protected: true,
  },
  {
    path: '/misplaced-payments',
    route: misplacedPaymentsRoute,
    protected: true,
  },
  {
    path: '/payment-expectations',
    route: partialPaymentsRoute,
    protected: true,
  },
  {
    path: '/disbursements',
    route: disbursementsRoute,
    protected: true,
  },
];

defaultRoutes.forEach((route) => {
  if (route.protected) {
    router.use(route.path, authMiddleware, route.route);
  } else {
    router.use(route.path, route.route);
  }
});

export default router;
