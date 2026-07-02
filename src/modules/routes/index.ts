import express from 'express';
import { webhookRoute } from './webhook.route';
import { accountsRoute } from '../accounts/accounts.route';
import { misplacedPaymentsRoute } from '../misplaced-payments/misplaced-payments.route';
import { partialPaymentsRoute } from '../partial-payments/partial-payments.route';
import { disbursementsRoute } from '../disbursements/disbursements.route';

const router = express.Router();

const defaultRoutes = [
  {
    path: '/webhooks',
    route: webhookRoute,
  },
  {
    path: '/accounts',
    route: accountsRoute,
  },
  {
    path: '/misplaced-payments',
    route: misplacedPaymentsRoute,
  },
  {
    path: '/payment-expectations',
    route: partialPaymentsRoute,
  },
  {
    path: '/disbursements',
    route: disbursementsRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
