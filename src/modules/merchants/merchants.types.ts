import { z } from 'zod';

export const RegisterMerchantSchema = z.object({
  businessName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(10).max(15).optional(),
});

export const GenerateKeySchema = z.object({
  label: z.string().min(2).max(50),
});

export const UpdateWebhookSchema = z.object({
  webhookUrl: z.string().url(),
});

export type RegisterMerchantInput = z.infer<typeof RegisterMerchantSchema>;
export type GenerateKeyInput = z.infer<typeof GenerateKeySchema>;
export type UpdateWebhookInput = z.infer<typeof UpdateWebhookSchema>;
