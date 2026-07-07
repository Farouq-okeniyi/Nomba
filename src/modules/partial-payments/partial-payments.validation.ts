import { z } from 'zod';

export const CreateExpectationSchema = z.object({
  reference: z.string().min(2).max(100),
  accountId: z.string().uuid('accountId must be a valid UUID'),
  merchantId: z.string().uuid('merchantId must be a valid UUID').optional(), // Injected from req.merchant in controller
  expectedAmount: z.number().int().positive(), // Amount in kobo
});

export type CreateExpectationInput = z.infer<typeof CreateExpectationSchema> & {
  merchantId: string; // always present after auth middleware sets req.merchant
};

export const UpdateExpectationSchema = z.object({
  expectedAmount: z.number().int().min(10000, "minimum is 10000 kobo (₦100)"),
});

export type UpdateExpectationInput = z.infer<typeof UpdateExpectationSchema>;
