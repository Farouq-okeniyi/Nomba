import { z } from 'zod';

export const RegisterMerchantSchema = z.object({
  businessName: z.string().min(2, "Business name must be at least 2 characters").max(40, "Business name must be at most 40 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(15, "Phone number must not exceed 15 digits").optional(),
});

export const RegenerateKeySchema = z.object({
  email: z.string().email('Must be a valid email address'),
  recoveryCode: z.string().min(1, 'Recovery code is required'),
});

export const UpdateWebhookSchema = z.object({
  webhookUrl: z.string().url(),
});

export type RegisterMerchantInput = z.infer<typeof RegisterMerchantSchema>;
export type RegenerateKeyInput = z.infer<typeof RegenerateKeySchema>;
export type UpdateWebhookInput = z.infer<typeof UpdateWebhookSchema>;

