import { nombaClient } from './nomba.client';
import { config } from '../config';

// ─── Virtual Accounts ─────────────────────────────────────────────────────────

export const createVirtualAccount = (payload: {
  accountRef: string;
  accountName: string;
  currency: string;
  bvn?: string;
}) =>
  nombaClient.post(`accounts/virtual`, payload);

export const updateVirtualAccount = (nombaAccountId: string, payload: Record<string, unknown>) =>
  nombaClient.put(`accounts/virtual/${nombaAccountId}`, payload);

export const suspendVirtualAccount = (nombaAccountId: string) =>
  nombaClient.put(`accounts/suspend/${nombaAccountId}`);

export const unsuspendVirtualAccount = (nombaAccountId: string) =>
  nombaClient.put(`accounts/unsuspend/${nombaAccountId}`);

// ─── Wallet ───────────────────────────────────────────────────────────────────

export const getWalletBalance = () =>
  nombaClient.get(`accounts/balance`);

// ─── Transfers ────────────────────────────────────────────────────────────────

export const initiateTransfer = (payload: {
  amount: number;
  bankCode: string;
  accountNumber: string;
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
