import { z } from 'zod';

export const ResolveMisplacedPaymentSchema = z.object({
  action: z.enum(['REROUTE', 'REFUND', 'WRITE_OFF']),
  note: z.string().min(5),
  resolvedBy: z.string().min(2),
  targetAccountId: z.string().uuid().optional(), // Required when action is REROUTE
});

export type ResolveMisplacedPaymentInput = z.infer<typeof ResolveMisplacedPaymentSchema>;
