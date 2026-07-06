import { Request, Response } from 'express';
import { Asyncly, respond } from '../../extension';
import { AccountsService } from './accounts.service';
import { toAccountDto } from './accounts.dto';

const createAccount = Asyncly(async (req: Request, res: Response) => {
  const account = await AccountsService.provisionAccount({ ...req.body, merchantId: req.merchant.id });
  respond.created(res, toAccountDto(account), 'Account provisioned successfully');
});

const getAccount = Asyncly(async (req: Request, res: Response) => {
  const account = await AccountsService.getAccountById(req.params.id as string, req.merchant.id);
  respond.ok(res, toAccountDto(account), 'Account fetched successfully');
});

const updateAccount = Asyncly(async (req: Request, res: Response) => {
  const account = await AccountsService.updateAccount(req.params.id as string, req.merchant.id, req.body);
  respond.ok(res, toAccountDto(account), 'Account updated successfully');
});

const suspendAccount = Asyncly(async (req: Request, res: Response) => {
  const account = await AccountsService.suspendAccount(req.params.id as string, req.merchant.id);
  respond.ok(res, toAccountDto(account), 'Account suspended successfully');
});

const reactivateAccount = Asyncly(async (req: Request, res: Response) => {
  const account = await AccountsService.reactivateAccount(req.params.id as string, req.merchant.id);
  respond.ok(res, toAccountDto(account), 'Account reactivated successfully');
});

const deleteAccount = Asyncly(async (req: Request, res: Response) => {
  const account = await AccountsService.closeAccount(req.params.id as string, req.merchant.id);
  respond.ok(res, toAccountDto(account), 'Account closed successfully');
});

const listAccounts = Asyncly(async (req: Request, res: Response) => {
  const accounts = await AccountsService.listAccounts(req.merchant.id);
  respond.ok(res, accounts.map(toAccountDto), 'Accounts fetched successfully');
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
