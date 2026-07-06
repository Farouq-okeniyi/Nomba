import { Request, Response } from 'express';
import { Asyncly, respond } from '../../extension';
import { PartialPaymentsService } from './partial-payments.service';
import { toPaymentExpectationDto, toPaymentInstallmentDto } from './partial-payments.dto';

const createExpectation = Asyncly(async (req: Request, res: Response) => {
  const expectation = await PartialPaymentsService.createExpectation({
    ...req.body,
    merchantId: req.merchant.id,
  });
  respond.created(res, toPaymentExpectationDto(expectation), 'Payment expectation created successfully');
});

const listExpectations = Asyncly(async (req: Request, res: Response) => {
  const expectations = await PartialPaymentsService.listExpectations(req.merchant.id);
  respond.ok(res, expectations.map(toPaymentExpectationDto), 'Payment expectations fetched successfully');
});

const getExpectation = Asyncly(async (req: Request, res: Response) => {
  const expectation = await PartialPaymentsService.getExpectationById(req.params.id as string, req.merchant.id);
  respond.ok(res, toPaymentExpectationDto(expectation), 'Payment expectation fetched successfully');
});

const getInstallments = Asyncly(async (req: Request, res: Response) => {
  const installments = await PartialPaymentsService.getInstallments(req.params.id as string, req.merchant.id);
  respond.ok(res, installments.map(toPaymentInstallmentDto), 'Payment installments fetched successfully');
});

export const partialPaymentsController = {
  createExpectation,
  listExpectations,
  getExpectation,
  getInstallments,
};
