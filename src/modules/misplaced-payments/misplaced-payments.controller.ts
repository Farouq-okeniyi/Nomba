import { Request, Response } from 'express';
import { Asyncly, respond } from '../../extension';
import { MisplacedPaymentsService } from './misplaced-payments.service';
import { toMisplacedPaymentDto } from './misplaced-payments.dto';

const listPayments = Asyncly(async (req: Request, res: Response) => {
  const payments = await MisplacedPaymentsService.listPayments(req.merchant.id);
  respond.ok(res, {
    object: 'list',
    data: payments.map(toMisplacedPaymentDto),
    has_more: false
  }, 'Misplaced payments fetched successfully');
});

const getPayment = Asyncly(async (req: Request, res: Response) => {
  const payment = await MisplacedPaymentsService.getPaymentById(req.params.id as string, req.merchant.id);
  respond.ok(res, toMisplacedPaymentDto(payment), 'Misplaced payment fetched successfully');
});

const resolvePayment = Asyncly(async (req: Request, res: Response) => {
  const payment = await MisplacedPaymentsService.resolvePayment(
    req.params.id as string,
    req.merchant.id,
    req.body,
  );
  respond.ok(res, toMisplacedPaymentDto(payment), 'Payment resolved successfully');
});

export const misplacedPaymentsController = {
  listPayments,
  getPayment,
  resolvePayment,
};
