import { MisplacedPayment, MisplacedPaymentReason, MisplacedPaymentStatus, MisplacedPaymentResolution } from '../../entities/misplaced-payment.entity';

export interface MisplacedPaymentDto {
  id: string;
  merchantId: string | null;
  accountId: string | null;
  amount: number;
  senderName: string | null;
  senderBank: string | null;
  senderAccountNumber: string | null;
  narration: string | null;
  receivedOnAccountNumber: string;
  reason: MisplacedPaymentReason;
  status: MisplacedPaymentStatus;
  resolutionAction: MisplacedPaymentResolution | null;
  resolutionNote: string | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  reroutedToAccountId: string | null;
  refundMerchantTxRef: string | null;
  receivedAt: Date;
  createdAt: Date;
}

export const toMisplacedPaymentDto = (payment: MisplacedPayment): MisplacedPaymentDto => {
  return {
    id: payment.id,
    merchantId: payment.merchantId || null,
    accountId: payment.accountId || null,
    amount: payment.amount,
    senderName: payment.senderName || null,
    senderBank: payment.senderBank || null,
    senderAccountNumber: payment.senderAccountNumber || null,
    narration: payment.narration || null,
    receivedOnAccountNumber: payment.receivedOnAccountNumber,
    reason: payment.reason,
    status: payment.status,
    resolutionAction: payment.resolutionAction || null,
    resolutionNote: payment.resolutionNote || null,
    resolvedBy: payment.resolvedBy || null,
    resolvedAt: payment.resolvedAt || null,
    reroutedToAccountId: payment.reroutedToAccountId || null,
    refundMerchantTxRef: payment.refundMerchantTxRef || null,
    receivedAt: payment.receivedAt,
    createdAt: payment.createdAt,
  };
};
