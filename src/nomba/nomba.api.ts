import { nombaClient } from './nomba.client';
import { config } from '../config';

// ─── Virtual Accounts ─────────────────────────────────────────────────────────

export const createVirtualAccount = (payload: {
  accountName: string;
  customerId: string;
  bvn?: string;
}) =>
  nombaClient.post(`/accounts/${config.NOMBA_PARENT_ACCOUNT_ID}/virtual-accounts`, payload);

export const updateVirtualAccount = (nombaAccountId: string, payload: Record<string, unknown>) =>
  nombaClient.patch(`/accounts/${config.NOMBA_PARENT_ACCOUNT_ID}/virtual-accounts/${nombaAccountId}`, payload);

export const suspendVirtualAccount = (nombaAccountId: string) =>
  nombaClient.post(`/accounts/${config.NOMBA_PARENT_ACCOUNT_ID}/virtual-accounts/${nombaAccountId}/suspend`);

export const unsuspendVirtualAccount = (nombaAccountId: string) =>
  nombaClient.post(`/accounts/${config.NOMBA_PARENT_ACCOUNT_ID}/virtual-accounts/${nombaAccountId}/unsuspend`);

// ─── Wallet ───────────────────────────────────────────────────────────────────

export const getWalletBalance = () =>
  nombaClient.get(`/accounts/${config.NOMBA_PARENT_ACCOUNT_ID}`);

// ─── Transfers ────────────────────────────────────────────────────────────────

export const initiateTransfer = (payload: {
  amount: number;
  bankCode: string;
  accountNumber: string;
  narration?: string;
  merchantTxRef: string;
}) =>
  nombaClient.post(`/transfers/initiate`, {
    ...payload,
    sourceAccountId: config.NOMBA_PARENT_ACCOUNT_ID,
  });
