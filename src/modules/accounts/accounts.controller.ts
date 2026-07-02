import { Request, Response } from 'express';
import { Asyncly } from '../../extension';
import { AccountsService } from './accounts.service';

const createAccount = Asyncly(async (req: Request, res: Response) => {
  const account = await AccountsService.provisionAccount(req.body);
  res.status(201).json({ status: 201, data: account });
});

const getAccount = Asyncly(async (req: Request, res: Response) => {
  const account = await AccountsService.getAccountById(req.params.id as string);
  res.status(200).json({ status: 200, data: account });
});

const updateAccount = Asyncly(async (req: Request, res: Response) => {
  const account = await AccountsService.updateAccount(req.params.id as string, req.body);
  res.status(200).json({ status: 200, data: account });
});

const suspendAccount = Asyncly(async (req: Request, res: Response) => {
  const account = await AccountsService.suspendAccount(req.params.id as string);
  res.status(200).json({ status: 200, message: 'Account suspended successfully', data: account });
});

const reactivateAccount = Asyncly(async (req: Request, res: Response) => {
  const account = await AccountsService.reactivateAccount(req.params.id as string);
  res.status(200).json({ status: 200, message: 'Account reactivated successfully', data: account });
});

const deleteAccount = Asyncly(async (req: Request, res: Response) => {
  const account = await AccountsService.closeAccount(req.params.id as string);
  res.status(200).json({ status: 200, message: 'Account closed successfully', data: account });
});

const listAccounts = Asyncly(async (req: Request, res: Response) => {
  const accounts = await AccountsService.listAccounts();
  res.status(200).json({ status: 200, data: accounts });
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
