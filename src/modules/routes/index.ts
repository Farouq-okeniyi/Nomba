import express from 'express';
import { webhookRoute } from './webhook.route';

const router = express.Router();

const defaultRoutes = [
  {
    path: '/webhooks',
    route: webhookRoute,
  },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

export default router;
