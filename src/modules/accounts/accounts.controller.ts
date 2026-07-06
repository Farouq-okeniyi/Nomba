import { Request, Response } from 'express';
import { Asyncly } from '../../extension';
import { AccountsService } from './accounts.service';
import { toAccountDto } from './accounts.dto';

const createAccount = Asyncly(async (req: Request, res: Response) => {
  const account = await AccountsService.provisionAccount({ ...req.body, merchantId: req.merchant.id });
  res.status(201).json({ status: 201, data: toAccountDto(account) });
});

const getAccount = Asyncly(async (req: Request, res: Response) => {
  const account = await AccountsService.getAccountById(req.params.id as string, req.merchant.id);
  res.status(200).json({ status: 200, data: toAccountDto(account) });
});

const updateAccount = Asyncly(async (req: Request, res: Response) => {
  const account = await AccountsService.updateAccount(req.params.id as string, req.merchant.id, req.body);
  res.status(200).json({ status: 200, data: toAccountDto(account) });
});

const suspendAccount = Asyncly(async (req: Request, res: Response) => {
  const account = await AccountsService.suspendAccount(req.params.id as string, req.merchant.id);
  res.status(200).json({ status: 200, message: 'Account suspended successfully', data: toAccountDto(account) });
});

const reactivateAccount = Asyncly(async (req: Request, res: Response) => {
  const account = await AccountsService.reactivateAccount(req.params.id as string, req.merchant.id);
  res.status(200).json({ status: 200, message: 'Account reactivated successfully', data: toAccountDto(account) });
});

const deleteAccount = Asyncly(async (req: Request, res: Response) => {
  const account = await AccountsService.closeAccount(req.params.id as string, req.merchant.id);
  res.status(200).json({ status: 200, message: 'Account closed successfully', data: toAccountDto(account) });
});

const listAccounts = Asyncly(async (req: Request, res: Response) => {
  const accounts = await AccountsService.listAccounts(req.merchant.id);
  res.status(200).json({ status: 200, data: accounts.map(toAccountDto) });
});

export const accountsController = {
  createAccount,
  getAccount,
  updateAccount,
  suspendAccount,
  reactivateAccount,
  deleteAccount,
  listAccounts,
};
