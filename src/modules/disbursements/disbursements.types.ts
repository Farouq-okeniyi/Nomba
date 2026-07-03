import { z } from 'zod';

export const DisbursementItemSchema = z.object({
  accountNumber: z.string().length(10),
  bankCode: z.string().min(3).max(6),    // Standard CBN bank code e.g. "058", "011"
  accountName: z.string().min(2),         // Resolved via Nomba lookup before transfer
  amount: z.number().int().positive(),    // Amount in kobo — never use floats
  narration: z.string().optional(),
});

export const CreateDisbursementSchema = z.object({
  reference: z.string().min(3).max(100),  // Developer's unique batch reference
  narration: z.string().optional(),
  items: z.array(DisbursementItemSchema).min(1),
});

export type CreateDisbursementInput = z.infer<typeof CreateDisbursementSchema>;
