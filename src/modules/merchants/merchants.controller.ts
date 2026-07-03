import { Request, Response } from 'express';
import { Asyncly } from '../../extension';
import { MerchantsService } from './merchants.service';

const register = Asyncly(async (req: Request, res: Response) => {
  const result = await MerchantsService.register(req.body);
  res.status(201).json({ status: 201, data: result });
});

const regenerateKey = Asyncly(async (req: Request, res: Response) => {
  const result = await MerchantsService.regenerateKey(req.merchant.id);
  res.status(200).json({ status: 200, data: result });
});

const updateWebhookUrl = Asyncly(async (req: Request, res: Response) => {
  const merchant = await MerchantsService.updateWebhookUrl(req.merchant.id, req.body.webhookUrl);
  res.status(200).json({ status: 200, message: 'Webhook URL updated successfully', data: merchant });
});

export const merchantsController = {
  register,
  regenerateKey,
  updateWebhookUrl,
};
