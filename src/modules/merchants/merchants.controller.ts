import { Request, Response } from 'express';
import { Asyncly, respond } from '../../extension';
import { MerchantsService } from './merchants.service';
import { toMerchantDto } from './merchants.dto';

const register = Asyncly(async (req: Request, res: Response) => {
  const result = await MerchantsService.register(req.body);
  respond.created(res, {
    merchantId: result.merchant.id,
    businessName: result.merchant.businessName,
    apiKey: result.apiKey,
    recoveryCode: result.recoveryCode,
  }, 'Save your apiKey and recoveryCode now. They cannot be shown again.');
});

const regenerateKey = Asyncly(async (req: Request, res: Response) => {
  const result = await MerchantsService.regenerateKey(req.body);
  respond.ok(res, result, 'API key regenerated successfully');
});

const updateWebhookUrl = Asyncly(async (req: Request, res: Response) => {
  const merchant = await MerchantsService.updateWebhookUrl(req.merchant!.id, req.body.webhookUrl);
  respond.ok(res, toMerchantDto(merchant), 'Webhook URL updated successfully');
});

export const merchantsController = {
  register,
  regenerateKey,
  updateWebhookUrl,
};
