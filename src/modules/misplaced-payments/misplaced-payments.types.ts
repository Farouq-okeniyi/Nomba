import { z } from 'zod';
import { MisplacedPaymentStatus } from '../../entities/misplaced-payment.entity';

export const UpdateMisplacedPaymentSchema = z.object({
  notes: z.string().min(5),
  resolvedBy: z.string().min(2),
});

export const RecoverMisplacedPaymentSchema = z.object({
  notes: z.string().min(5),
  resolvedBy: z.string().min(2),
  targetExpectationReference: z.string().optional(), // If moving this payment to a expectation installment
});

export type UpdateMisplacedPaymentInput = z.infer<typeof UpdateMisplacedPaymentSchema>;
export type RecoverMisplacedPaymentInput = z.infer<typeof RecoverMisplacedPaymentSchema>;
