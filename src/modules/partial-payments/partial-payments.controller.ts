import { Request, Response } from 'express';
import { Asyncly } from '../../extension';
import { PartialPaymentsService } from './partial-payments.service';

const createExpectation = Asyncly(async (req: Request, res: Response) => {
  const expectation = await PartialPaymentsService.createExpectation({
    ...req.body,
    merchantId: req.merchant.id,
  });
  res.status(201).json({ status: 201, data: expectation });
});

const listExpectations = Asyncly(async (req: Request, res: Response) => {
  const expectations = await PartialPaymentsService.listExpectations(req.merchant.id);
  res.status(200).json({ status: 200, data: expectations });
});

const getExpectation = Asyncly(async (req: Request, res: Response) => {
  const expectation = await PartialPaymentsService.getExpectationById(req.params.id as string, req.merchant.id);
  res.status(200).json({ status: 200, data: expectation });
});

const getInstallments = Asyncly(async (req: Request, res: Response) => {
  const installments = await PartialPaymentsService.getInstallments(req.params.id as string, req.merchant.id);
  res.status(200).json({ status: 200, data: installments });
});

export const partialPaymentsController = {
  createExpectation,
  listExpectations,
  getExpectation,
  getInstallments,
};
