import { Request, Response } from 'express';
import { Asyncly } from '../../extension';
import { MisplacedPaymentsService } from './misplaced-payments.service';

const listPayments = Asyncly(async (req: Request, res: Response) => {
  const payments = await MisplacedPaymentsService.listPayments();
  res.status(200).json({ status: 200, data: payments });
});

const getPayment = Asyncly(async (req: Request, res: Response) => {
  const payment = await MisplacedPaymentsService.getPaymentById(req.params.id as string);
  res.status(200).json({ status: 200, data: payment });
});

const holdPayment = Asyncly(async (req: Request, res: Response) => {
  const payment = await MisplacedPaymentsService.holdPayment(req.params.id as string, req.body);
  res.status(200).json({ status: 200, message: 'Payment marked as HELD', data: payment });
});

const recoverPayment = Asyncly(async (req: Request, res: Response) => {
  const payment = await MisplacedPaymentsService.recoverPayment(req.params.id as string, req.body);
  res.status(200).json({ status: 200, message: 'Payment marked as RECOVERED', data: payment });
});

const refundPayment = Asyncly(async (req: Request, res: Response) => {
  const payment = await MisplacedPaymentsService.refundPayment(req.params.id as string, req.body);
  res.status(200).json({ status: 200, message: 'Refund initiated successfully', data: payment });
});

export const misplacedPaymentsController = {
  listPayments,
  getPayment,
  holdPayment,
  recoverPayment,
  refundPayment,
};
