import express from 'express';
import { disbursementsController } from './disbursements.controller';
import { validateData } from '../../middlewares';
import { CreateDisbursementSchema } from './disbursements.validation';

// Swagger docs → src/config/swagger/disbursements.swagger.ts

const disbursementsRoute = express.Router();

disbursementsRoute.route('/')
  .post(validateData(CreateDisbursementSchema), disbursementsController.createBatch)
  .get(disbursementsController.listBatches);

disbursementsRoute.get('/:id',                disbursementsController.getBatch);
disbursementsRoute.post('/:id/retry-failed',  disbursementsController.retryFailed);

export { disbursementsRoute };
