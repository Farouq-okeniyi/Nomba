import { Disbursement, DisbursementStatus } from '../../entities/Disbursement';
import { DisbursementRecipient, RecipientStatus } from '../../entities/DisbursementRecipient';

export interface DisbursementDto {
  id: string;
  merchantId: string;
  reference: string;
  narration: string | null;
  totalAmount: number;
  totalRecipients: number;
  totalSuccess: number;
  totalFailed: number;
  totalPending: number;
  status: DisbursementStatus;
  completedAt: Date | null;
  createdAt: Date;
  recipients?: DisbursementRecipientDto[];
}

export interface DisbursementRecipientDto {
  id: string;
  merchantId: string;
  disbursementId: string;
  accountId: string | null;
  accountNumber: string;
  bankCode: string;
  accountName: string;
  amount: number;
  narration: string | null;
  merchantTxRef: string;
  idempotencyKey: string | null;
  nombaTxId: string | null;
  nombaStatus: string | null;
  status: RecipientStatus;
  failureReason: string | null;
  retryCount: number;
  lastRetriedAt: Date | null;
  createdAt: Date;
}

export const toDisbursementRecipientDto = (recipient: DisbursementRecipient): DisbursementRecipientDto => {
  return {
    id: recipient.id,
    merchantId: recipient.merchantId,
    disbursementId: recipient.disbursementId,
    accountId: recipient.accountId || null,
    accountNumber: recipient.accountNumber,
    bankCode: recipient.bankCode,
    accountName: recipient.accountName,
    amount: recipient.amount,
    narration: recipient.narration || null,
    merchantTxRef: recipient.merchantTxRef,
    idempotencyKey: recipient.idempotencyKey || null,
    nombaTxId: recipient.nombaTxId || null,
    nombaStatus: recipient.nombaStatus || null,
    status: recipient.status,
    failureReason: recipient.failureReason || null,
    retryCount: recipient.retryCount,
    lastRetriedAt: recipient.lastRetriedAt || null,
    createdAt: recipient.createdAt,
  };
};

export const toDisbursementDto = (disbursement: Disbursement): DisbursementDto => {
  const dto: DisbursementDto = {
    id: disbursement.id,
    merchantId: disbursement.merchantId,
    reference: disbursement.reference,
    narration: disbursement.narration || null,
    totalAmount: disbursement.totalAmount,
    totalRecipients: disbursement.totalRecipients,
    totalSuccess: disbursement.totalSuccess,
    totalFailed: disbursement.totalFailed,
    totalPending: disbursement.totalPending,
    status: disbursement.status,
    completedAt: disbursement.completedAt || null,
    createdAt: disbursement.createdAt,
  };

  if (disbursement.recipients) {
    dto.recipients = disbursement.recipients.map(toDisbursementRecipientDto);
  }

  return dto;
};
