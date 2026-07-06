import { Request, Response } from 'express';
import { Asyncly } from '../../extension';
import { PartialPaymentsService } from './partial-payments.service';
import { toPaymentExpectationDto, toPaymentInstallmentDto } from './partial-payments.dto';

const createExpectation = Asyncly(async (req: Request, res: Response) => {
  const expectation = await PartialPaymentsService.createExpectation({
    ...req.body,
    merchantId: req.merchant.id,
  });
  res.status(201).json({ status: 201, data: toPaymentExpectationDto(expectation) });
});

const listExpectations = Asyncly(async (req: Request, res: Response) => {
  const expectations = await PartialPaymentsService.listExpectations(req.merchant.id);
  res.status(200).json({ status: 200, data: expectations.map(toPaymentExpectationDto) });
});

const getExpectation = Asyncly(async (req: Request, res: Response) => {
  const expectation = await PartialPaymentsService.getExpectationById(req.params.id as string, req.merchant.id);
  res.status(200).json({ status: 200, data: toPaymentExpectationDto(expectation) });
});

const getInstallments = Asyncly(async (req: Request, res: Response) => {
  const installments = await PartialPaymentsService.getInstallments(req.params.id as string, req.merchant.id);
  res.status(200).json({ status: 200, data: installments.map(toPaymentInstallmentDto) });
});

export const partialPaymentsController = {
  createExpectation,
  listExpectations,
  getExpectation,
  getInstallments,
};
