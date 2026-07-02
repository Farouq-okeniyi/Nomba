import { z } from 'zod';

export const CreateExpectationSchema = z.object({
  reference: z.string().min(2).max(100),
  customerId: z.string().min(1),
  expectedAmount: z.number().int().positive(), // Amount in kobo
  dueDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
});

export type CreateExpectationInput = z.infer<typeof CreateExpectationSchema>;
