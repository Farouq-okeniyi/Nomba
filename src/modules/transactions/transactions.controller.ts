import { Request, Response } from 'express';
import { Asyncly } from '../../extension';
import { TransactionsService } from './transactions.service';
import { toTransactionDto } from './transactions.dto';

const listByAccount = Asyncly(async (req: Request, res: Response) => {
  const transactions = await TransactionsService.listByAccount(req.params.accountId as string, req.merchant.id);
  res.status(200).json({ status: 200, data: transactions.map(toTransactionDto) });
});

const getByMerchantRef = Asyncly(async (req: Request, res: Response) => {
  const transaction = await TransactionsService.getByMerchantRef(req.params.merchantTxRef as string, req.merchant.id);
  res.status(200).json({ status: 200, data: toTransactionDto(transaction) });
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

const getMerchantStatement = Asyncly(async (req: Request, res: Response) => {
  const merchantId = req.merchant.id;
  const { from, to, format, page, limit } = req.query;

  const result = await TransactionsService.getMerchantStatement(merchantId, {
    from: from as string,
    to: to as string,
    format: (format as string) || 'json',
    page: parseInt(page as string) || 1,
    limit: parseInt(limit as string) || 50,
  });

  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="statement.csv"');
    return res.send(result);
  }

  res.status(200).json(result);
});

export const transactionsController = {
  listByAccount,
  getByMerchantRef,
  getStatement,
  getMerchantStatement,
};
