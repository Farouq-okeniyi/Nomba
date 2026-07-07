import { z } from 'zod';

export const ResolveMisplacedPaymentSchema = z.object({
  action: z.enum(['REROUTE', 'REFUND', 'WRITE_OFF']),
  note: z.string().min(5),
  resolvedBy: z.string().min(2),
  targetAccountId: z.string().uuid().optional(), // Required when action is REROUTE
  refundAccountNumber: z.string().optional(),
  refundBankCode: z.string().optional(),
  refundAccountName: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.action === 'REROUTE' && !data.targetAccountId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'targetAccountId is required for REROUTE action',
      path: ['targetAccountId'],
    });
  }
  if (data.action === 'REFUND') {
    if (!data.refundAccountNumber) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Required for REFUND action', path: ['refundAccountNumber'] });
    }
    if (!data.refundBankCode) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Required for REFUND action', path: ['refundBankCode'] });
    }
    if (!data.refundAccountName) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Required for REFUND action', path: ['refundAccountName'] });
    }
  }
});

export type ResolveMisplacedPaymentInput = z.infer<typeof ResolveMisplacedPaymentSchema>;
