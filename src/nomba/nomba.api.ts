import { nombaClient } from './nomba.client';
import { config } from '../config';

// ─── Virtual Accounts ─────────────────────────────────────────────────────────

export const createVirtualAccount = (payload: {
  accountRef: string;
  accountName: string;
  currency: string;
  bvn?: string;
  amount?: number;
}) =>
  nombaClient.post(`accounts/virtual`, payload);

export const updateVirtualAccount = (accountRef: string, payload: Record<string, unknown>) =>
  nombaClient.put(`accounts/virtual/${accountRef}`, payload);

export const suspendVirtualAccount = (accountHolderId: string) =>
  nombaClient.put(`accounts/suspend/${accountHolderId}`, {}, { headers: { accountId: accountHolderId } });

export const unsuspendVirtualAccount = (accountHolderId: string) =>
  nombaClient.put(`accounts/reactivate/${accountHolderId}`, {}, { headers: { accountId: accountHolderId } });

// ─── Wallet ───────────────────────────────────────────────────────────────────

export const getWalletBalance = () =>
  nombaClient.get(`accounts/balance`);

// ─── Transfers ────────────────────────────────────────────────────────────────

export const lookupBankAccount = async (payload: { accountNumber: string; bankCode: string }) => {
  const response = await nombaClient.post(`transfers/bank/lookup`, payload);
  return response.data?.data;
};

export const initiateTransfer = (payload: {
  amount: number;
  bankCode: string;
  accountNumber: string;
  accountName?: string;
  senderName?: string;
  narration?: string;
  merchantTxRef: string;
}, idempotencyKey: string) =>
  nombaClient.post(`transfers/bank`, {
    ...payload,
    sourceAccountId: config.NOMBA_PARENT_ACCOUNT_ID,
  }, {
    headers: { 'X-Idempotent-key': idempotencyKey }
  });

export const fetchTransactions = (dateFrom: string, dateTo: string) =>
  nombaClient.get(`transactions/bank?dateFrom=${dateFrom}&dateTo=${dateTo}`);
