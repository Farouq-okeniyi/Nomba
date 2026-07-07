import { z } from 'zod';

export const CreateAccountSchema = z.object({
  firstName: z.string().min(1, "first Name cannot be empty").max(100, "first Name cannot be more than 100 characters"),
  lastName: z.string().min(1, "last Name cannot be empty").max(100, "last Name cannot be more than 100 characters"),
  email: z.string().email("email is invalid").max(100, "email cannot be more than 100 characters"),
  phone: z.string().min(10, "phone Number must be at least 10 digits").max(15, "phone Number cannot be more than 15 digits").regex(/^\d+$/, "phone Number must contain only digits"),
  bvn: z.string().length(11, "BVN must be 11 digits").regex(/^\d+$/, "BVN must contain only digits").optional(),
  nin: z.string().length(11, "NIN must be 11 digits").regex(/^\d+$/, "NIN must contain only digits").optional(),
  expectedAmount: z.number().int().min(10000, "minimum expectedAmount is 10000 kobo (₦100) in sandbox").optional(),
});

export const UpdateAccountSchema = z.object({
  accountName: z.string().min(2, "account Name must be at least 2 characters").max(50, "account Name cannot be more than 50 characters").optional(),
  expectedAmount: z.number().int().min(10000, "minimum expectedAmount is 10000 kobo (₦100) in sandbox").optional(),
});

export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;
export type UpdateAccountInput = z.infer<typeof UpdateAccountSchema>;
