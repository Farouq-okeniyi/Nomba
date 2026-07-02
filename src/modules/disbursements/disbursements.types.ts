import { z } from 'zod';

export const DisbursementItemSchema = z.object({
  recipientName: z.string().min(2),
  accountNumber: z.string().length(10),
  bankCode: z.string().min(3).max(6), // Standard CBN bank codes e.g. 058, 011
  amount: z.number().int().positive(), // Amount in kobo
});

export const CreateDisbursementSchema = z.object({
  label: z.string().min(3).max(100),
  items: z.array(DisbursementItemSchema).min(1),
});

export type CreateDisbursementInput = z.infer<typeof CreateDisbursementSchema>;
