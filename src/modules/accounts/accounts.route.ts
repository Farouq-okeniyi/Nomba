import express from 'express';
import { accountsController } from './accounts.controller';
import { validateData } from '../../middlewares';
import { CreateAccountSchema, UpdateAccountSchema } from './accounts.validation';

// Swagger docs → src/config/swagger/accounts.swagger.ts

const accountsRoute = express.Router();

accountsRoute.route('/')
  .post(validateData(CreateAccountSchema), accountsController.createAccount)
  .get(accountsController.listAccounts);

accountsRoute.route('/:id')
  .get(accountsController.getAccount)
  .put(validateData(UpdateAccountSchema), accountsController.updateAccount);

accountsRoute.post('/:id/suspend',    accountsController.suspendAccount);
accountsRoute.post('/:id/reactivate', accountsController.reactivateAccount);

export { accountsRoute };
