import { z } from 'zod';

export const DisbursementItemSchema = z.object({
  accountNumber: z.string().length(10, "accountNumber must be exactly 10 digits"),
  bankCode: z.string().min(3).max(6),
  amount: z.number().int().min(100, "minimum 100 kobo"),
  narration: z.string().optional(),
});

export const CreateDisbursementSchema = z.object({
  reference: z.string().min(1),
  narration: z.string().optional(),
  items: z.array(DisbursementItemSchema).min(1).max(100),
});

export type CreateDisbursementInput = z.infer<typeof CreateDisbursementSchema>;
