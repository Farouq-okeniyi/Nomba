import { Request, Response } from 'express';
import { Asyncly } from '../../extension';
import { WebhookPayloadSchema } from './webhook.types';
import { handleWebhookEvent } from './webhook.service';
import { ApiError } from '../../middlewares';

// Receives and processes all verified Nomba webhook events
const receiveWebhook = Asyncly(async (req: Request, res: Response) => {
  const parsed = WebhookPayloadSchema.safeParse(req.body);

  if (!parsed.success) {
    throw new ApiError(400, 'Invalid webhook payload', true, {
      errors: parsed.error.flatten(),
    });
  }

  handleWebhookEvent(parsed.data);

  // Always return 200 fast — Nomba will retry if we don't acknowledge
  res.status(200).json({ received: true });
});

export const webhookController = { receiveWebhook };
