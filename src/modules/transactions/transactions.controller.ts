import { Request, Response } from 'express';
import { Asyncly } from '../../extension';
import { TransactionsService } from './transactions.service';

const listByAccount = Asyncly(async (req: Request, res: Response) => {
  const transactions = await TransactionsService.listByAccount(req.params.accountId as string, req.merchant.id);
  res.status(200).json({ status: 200, data: transactions });
});

const getByMerchantRef = Asyncly(async (req: Request, res: Response) => {
  const transaction = await TransactionsService.getByMerchantRef(req.params.merchantTxRef as string, req.merchant.id);
  res.status(200).json({ status: 200, data: transaction });
});

const getStatement = Asyncly(async (req: Request, res: Response) => {
  const format = req.query.format === 'csv' ? 'csv' : 'json';
  const statement = await TransactionsService.getStatement(req.params.accountId as string, req.merchant.id, format);
  
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="statement_${req.params.accountId}.csv"`);
    res.status(200).send(statement);
  } else {
    res.status(200).json({ status: 200, data: statement });
  }
});

export const transactionsController = {
  listByAccount,
  getByMerchantRef,
  getStatement,
};
