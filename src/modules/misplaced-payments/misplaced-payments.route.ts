import express from 'express';
import { misplacedPaymentsController } from './misplaced-payments.controller';
import { validateData } from '../../middlewares';
import { ResolveMisplacedPaymentSchema } from './misplaced-payments.validation';

// Swagger docs → src/config/swagger/misplaced-payments.swagger.ts

const misplacedPaymentsRoute = express.Router();

misplacedPaymentsRoute.get('/',           misplacedPaymentsController.listPayments);
misplacedPaymentsRoute.get('/:id',        misplacedPaymentsController.getPayment);
misplacedPaymentsRoute.post('/:id/resolve', validateData(ResolveMisplacedPaymentSchema), misplacedPaymentsController.resolvePayment);

export { misplacedPaymentsRoute };
