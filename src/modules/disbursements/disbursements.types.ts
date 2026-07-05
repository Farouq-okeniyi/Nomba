import { z } from 'zod';

export const DisbursementItemSchema = z.object({
  accountId: z.string().uuid("accountId must be a valid UUID").optional(),
  accountNumber: z.string().min(10).max(10, "accountNumber must be exactly 10 digits"),
  bankCode: z.string().min(3).max(6, "bankCode must be a valid bank code"),
  amount: z.number().int().min(100, "amount must be at least 100 kobo (₦1)"),
  narration: z.string().optional(),
});

export const CreateDisbursementSchema = z.object({
  reference: z.string().min(1),
  narration: z.string().optional(),
  items: z.array(DisbursementItemSchema).min(1).max(100),
});

export type CreateDisbursementInput = z.infer<typeof CreateDisbursementSchema>;
