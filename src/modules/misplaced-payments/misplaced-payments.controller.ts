import { Request, Response } from 'express';
import { Asyncly } from '../../extension';
import { MisplacedPaymentsService } from './misplaced-payments.service';
import { toMisplacedPaymentDto } from './misplaced-payments.dto';

const listPayments = Asyncly(async (req: Request, res: Response) => {
  const payments = await MisplacedPaymentsService.listPayments(req.merchant.id);
  res.status(200).json({ status: 200, data: payments.map(toMisplacedPaymentDto) });
});

const getPayment = Asyncly(async (req: Request, res: Response) => {
  const payment = await MisplacedPaymentsService.getPaymentById(req.params.id as string, req.merchant.id);
  res.status(200).json({ status: 200, data: toMisplacedPaymentDto(payment) });
});

const resolvePayment = Asyncly(async (req: Request, res: Response) => {
  const payment = await MisplacedPaymentsService.resolvePayment(
    req.params.id as string,
    req.merchant.id,
    req.body,
  );
  res.status(200).json({ status: 200, message: 'Payment resolved successfully', data: toMisplacedPaymentDto(payment) });
});

export const misplacedPaymentsController = {
  listPayments,
  getPayment,
  resolvePayment,
};
