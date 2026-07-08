import { Request, Response } from 'express';
import { Asyncly, respond } from '../../extension';
import { DisbursementsService } from './disbursements.service';
import { toDisbursementDto } from './disbursements.dto';

const createBatch = Asyncly(async (req: Request, res: Response) => {
  const batch = await DisbursementsService.createAndExecuteBatch({ ...req.body, merchantId: req.merchant.id });
  respond.created(res, toDisbursementDto(batch), 'Disbursement batch created and processing');
});

const listBatches = Asyncly(async (req: Request, res: Response) => {
  const batches = await DisbursementsService.listBatches(req.merchant.id);
  respond.ok(res, {
    object: 'list',
    data: batches.map(toDisbursementDto),
    has_more: false
  }, 'Disbursement batches fetched successfully');
});

const getBatch = Asyncly(async (req: Request, res: Response) => {
  const batch = await DisbursementsService.getBatchById(req.params.id as string, req.merchant.id);
  respond.ok(res, toDisbursementDto(batch), 'Disbursement batch fetched successfully');
});

const retryFailed = Asyncly(async (req: Request, res: Response) => {
  const batch = await DisbursementsService.retryFailed(req.params.id as string, req.merchant.id);
  respond.ok(res, toDisbursementDto(batch), 'Retried failed recipients in batch');
});

export const disbursementsController = {
  createBatch,
  listBatches,
  getBatch,
  retryFailed,
};
