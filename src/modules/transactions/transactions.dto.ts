import { Transaction, TransactionType, TransactionStatus } from '../../entities/Transaction';

export interface TransactionDto {
  id: string;
  merchantId: string;
  accountId: string | null;
  merchantTxRef: string;
  nombaTxId: string | null;
  nombaRequestId: string | null;
  idempotencyKey: string | null;
  amount: number;
  currency: string;
  senderName: string | null;
  senderBank: string | null;
  senderAccountNumber: string | null;
  narration: string | null;
  type: TransactionType;
  status: TransactionStatus;
  paymentExpectationId: string | null;
  settledAt: Date | null;
  createdAt: Date;
}

export const toTransactionDto = (transaction: Transaction): TransactionDto => {
  return {
    id: transaction.id,
    merchantId: transaction.merchantId,
    accountId: transaction.accountId || null,
    merchantTxRef: transaction.merchantTxRef,
    nombaTxId: transaction.nombaTxId || null,
    nombaRequestId: transaction.nombaRequestId || null,
    idempotencyKey: transaction.idempotencyKey || null,
    amount: transaction.amount,
    currency: transaction.currency,
    senderName: transaction.senderName || null,
    senderBank: transaction.senderBank || null,
    senderAccountNumber: transaction.senderAccountNumber || null,
    narration: transaction.narration || null,
    type: transaction.type,
    status: transaction.status,
    paymentExpectationId: transaction.paymentExpectationId || null,
    settledAt: transaction.settledAt || null,
    createdAt: transaction.createdAt,
  };
};
