import { Request, Response } from 'express';
import { Asyncly } from '../../extension';
import { DisbursementsService } from './disbursements.service';

const createBatch = Asyncly(async (req: Request, res: Response) => {
  const batch = await DisbursementsService.createAndExecuteBatch(req.body);
  res.status(201).json({ status: 201, data: batch });
});

const listBatches = Asyncly(async (req: Request, res: Response) => {
  const batches = await DisbursementsService.listBatches();
  res.status(200).json({ status: 200, data: batches });
});

const getBatch = Asyncly(async (req: Request, res: Response) => {
  const batch = await DisbursementsService.getBatchById(req.params.id as string);
  res.status(200).json({ status: 200, data: batch });
});

const retryFailed = Asyncly(async (req: Request, res: Response) => {
  const batch = await DisbursementsService.retryFailedItems(req.params.id as string);
  res.status(200).json({ status: 200, message: 'Retried failed transfers in batch', data: batch });
});

export const disbursementsController = {
  createBatch,
  listBatches,
  getBatch,
  retryFailed,
};
