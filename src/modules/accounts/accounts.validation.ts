import { z } from 'zod';

export const CreateAccountSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(15),
  bvn: z.string().length(11).optional(),
  nin: z.string().optional(),
});

export const UpdateAccountSchema = z.object({
  accountName: z.string().min(3).max(100).optional(),
});

export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>;
