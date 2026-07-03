import { Request, Response } from 'express';
import { Asyncly } from '../../extension';
import { DisbursementsService } from './disbursements.service';

const createBatch = Asyncly(async (req: Request, res: Response) => {
  const batch = await DisbursementsService.createAndExecuteBatch({ ...req.body, merchantId: req.merchant.id });
  res.status(201).json({ status: 201, data: batch });
});

const listBatches = Asyncly(async (req: Request, res: Response) => {
  const batches = await DisbursementsService.listBatches(req.merchant.id);
  res.status(200).json({ status: 200, data: batches });
});

const getBatch = Asyncly(async (req: Request, res: Response) => {
  const batch = await DisbursementsService.getBatchById(req.params.id as string, req.merchant.id);
  res.status(200).json({ status: 200, data: batch });
});

const retryFailed = Asyncly(async (req: Request, res: Response) => {
  const batch = await DisbursementsService.retryFailed(req.params.id as string, req.merchant.id);
  res.status(200).json({ status: 200, message: 'Retried failed recipients in batch', data: batch });
});

export const disbursementsController = {
  createBatch,
  listBatches,
  getBatch,
  retryFailed,
};
