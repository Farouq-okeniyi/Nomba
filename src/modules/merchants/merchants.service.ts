import { AppDataSource } from '../../config';
import { Merchant } from '../../entities/Merchant';
import { ApiError } from '../../middlewares';
import { generateApiKey } from '../../extension/apiKey';
import { RegisterMerchantInput, UpdateWebhookInput } from './merchants.types';
import { v4 as uuidv4 } from 'uuid';

const merchantRepository = AppDataSource.getRepository(Merchant);

export class MerchantsService {
  static async register(input: RegisterMerchantInput): Promise<{ merchant: Merchant; apiKey: string }> {
    const existing = await merchantRepository.findOne({ where: { email: input.email } });
    if (existing) {
      throw new ApiError(400, 'Merchant with this email already exists', true);
    }

    const webhookSecret = uuidv4().replace(/-/g, '');
    const keyData = generateApiKey();

    const merchant = merchantRepository.create({
      businessName: input.businessName,
      email: input.email,
      phone: input.phone,
      webhookSecret,
      apiKeyHash: keyData.hash,
      apiKeyPrefix: keyData.prefix,
    });

    await merchantRepository.save(merchant);

    return { merchant, apiKey: keyData.raw };
  }

  static async regenerateKey(merchantId: string): Promise<{ apiKey: string }> {
    const merchant = await merchantRepository.findOne({ where: { id: merchantId } });
    if (!merchant) throw new ApiError(404, 'Merchant not found', true);

    const keyData = generateApiKey();
    merchant.apiKeyHash = keyData.hash;
    merchant.apiKeyPrefix = keyData.prefix;

    await merchantRepository.save(merchant);

    return { apiKey: keyData.raw };
  }

  static async updateWebhookUrl(merchantId: string, url: string): Promise<Merchant> {
    const merchant = await merchantRepository.findOne({ where: { id: merchantId } });
    if (!merchant) throw new ApiError(404, 'Merchant not found', true);
    
    merchant.webhookUrl = url;
    return await merchantRepository.save(merchant);
  }
}
