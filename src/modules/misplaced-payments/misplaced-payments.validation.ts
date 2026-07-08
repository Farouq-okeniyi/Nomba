import { z } from 'zod';

export const ResolveMisplacedPaymentSchema = z.object({
  action: z.enum(['REROUTE', 'REFUND', 'WRITE_OFF']),
  note: z.string().min(1, "note is required"),
  resolvedBy: z.string().min(1, "resolvedBy is required"),

  // Required only for REFUND — operator obtains sender details manually
  senderAccountNumber: z.string().length(10).optional(),
  senderBankCode: z.string().min(3).max(6).optional(),

  // Required only for REROUTE
  targetAccountId: z.string().uuid().optional(),

}).refine(data => {
  if (data.action === 'REFUND') {
    return !!data.senderAccountNumber && !!data.senderBankCode;
  }
  if (data.action === 'REROUTE') {
    return !!data.targetAccountId;
  }
  return true;
}, {
  message: 'REFUND requires senderAccountNumber and senderBankCode. REROUTE requires targetAccountId.',
});

export type ResolveMisplacedPaymentInput = z.infer<typeof ResolveMisplacedPaymentSchema>;
