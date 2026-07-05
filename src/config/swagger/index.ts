/**
 * src/config/swagger/index.ts
 *
 * Merges all per-route swagger path definitions into a single paths object.
 * Import this into swagger.ts to build the final spec.
 */

import { webhooksDocs }            from './webhooks.swagger';
import { merchantsDocs }           from './merchants.swagger';
import { accountsDocs }            from './accounts.swagger';
import { disbursementsDocs }       from './disbursements.swagger';
import { misplacedPaymentsDocs }   from './misplaced-payments.swagger';
import { paymentExpectationsDocs } from './payment-expectations.swagger';
import { transactionsDocs }        from './transactions.swagger';

export const allPaths = {
  ...webhooksDocs.paths,
  ...merchantsDocs.paths,
  ...accountsDocs.paths,
  ...disbursementsDocs.paths,
  ...misplacedPaymentsDocs.paths,
  ...paymentExpectationsDocs.paths,
  ...transactionsDocs.paths,
};
