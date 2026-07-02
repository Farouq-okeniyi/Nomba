import { z } from 'zod';

export const CreateAccountSchema = z.object({
  accountName: z.string().min(3).max(100),
  customerId: z.string().min(1),
  bvn: z.string().length(11).optional(),
});

export const UpdateAccountSchema = z.object({
  accountName: z.string().min(3).max(100).optional(),
  kycTier: z.number().min(1).max(3).optional(),
});

export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>;
