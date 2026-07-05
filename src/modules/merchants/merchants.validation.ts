import { z } from 'zod';

export const RegisterMerchantSchema = z.object({
  businessName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(15).optional(),
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

