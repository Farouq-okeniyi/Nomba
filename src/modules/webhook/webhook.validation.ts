import { z } from 'zod';

const TransactionSchema = z.object({
  transactionId: z.string(),
  type: z.string(),
  time: z.string(),
  responseCode: z.string().optional().default(''),
  fee: z.number().optional(),
  sessionId: z.string().optional(),
  aliasAccountNumber: z.string().optional(),
  aliasAccountName: z.string().optional(),
  aliasAccountReference: z.string().optional(),
  aliasAccountType: z.string().optional(),
  transactionAmount: z.number().optional(),
  narration: z.string().optional(),
  originatingFrom: z.string().optional(),
  merchantTxRef: z.string().optional(),
  responseCodeMessage: z.string().optional(),
  rrn: z.string().optional(),
  cardIssuer: z.string().optional(),
  cardBank: z.string().optional(),
  cardPan: z.string().optional(),
});

const MerchantSchema = z.object({
  walletId: z.string().optional(),
  walletBalance: z.number().optional(),
  userId: z.string(),
});

const CustomerSchema = z.object({
  bankCode: z.string().optional(),
  senderName: z.string().optional(),
  recipientName: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  productId: z.string().optional(),
  cardPan: z.string().optional(),
});

export const WebhookPayloadSchema = z.object({
  event_type: z.string(),
  requestId: z.string(),
  data: z.object({
    merchant: MerchantSchema,
    terminal: z.record(z.unknown()).optional().default({}),
    transaction: TransactionSchema,
    customer: CustomerSchema.optional(),
  }),
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

export const NOMBA_EVENTS = {
  PAYMENT_SUCCESS: 'payment_success',
  PAYOUT_SUCCESS: 'payout_success',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_REVERSAL: 'payment_reversal',
  PAYOUT_FAILED: 'payout_failed',
  PAYOUT_REFUND: 'payout_refund',
} as const;
