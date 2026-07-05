import express from 'express';
import { partialPaymentsController } from './partial-payments.controller';
import { validateData } from '../../middlewares';
import { CreateExpectationSchema } from './partial-payments.validation';

// Swagger docs → src/config/swagger/payment-expectations.swagger.ts

const partialPaymentsRoute = express.Router();

partialPaymentsRoute.route('/')
  .post(validateData(CreateExpectationSchema), partialPaymentsController.createExpectation)
  .get(partialPaymentsController.listExpectations);

partialPaymentsRoute.get('/:id',               partialPaymentsController.getExpectation);
partialPaymentsRoute.get('/:id/installments',  partialPaymentsController.getInstallments);

export { partialPaymentsRoute };
