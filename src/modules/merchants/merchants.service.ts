import { AppDataSource } from '../../config';
import { Merchant } from '../../entities/Merchant';
import { ApiError } from '../../middlewares';
import { generateApiKey } from '../../extension/apiKey';
import { RegisterMerchantInput, RegenerateKeyInput, UpdateWebhookInput } from './merchants.validation';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const merchantRepository = AppDataSource.getRepository(Merchant);

export class MerchantsService {
  static async register(input: RegisterMerchantInput): Promise<{ merchant: Merchant; apiKey: string; recoveryCode: string }> {
    const existing = await merchantRepository.findOne({ where: { email: input.email } });
    if (existing) {
      throw new ApiError(400, 'Merchant with this email already exists', true);
    }

    const webhookSecret = uuidv4().replace(/-/g, '');
    const keyData = generateApiKey();

    // Generate recovery code: REC-8 random digits
    const rawRecoveryCode = `REC-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const recoveryCodeHash = crypto.createHash('sha256').update(rawRecoveryCode).digest('hex');

    const merchant = merchantRepository.create({
      businessName: input.businessName,
      email: input.email,
      phone: input.phone,
      webhookSecret,
      apiKeyHash: keyData.hash,
      apiKeyPrefix: keyData.prefix,
      recoveryCodeHash,
    });

    await merchantRepository.save(merchant);

    return { merchant, apiKey: keyData.raw, recoveryCode: rawRecoveryCode };
  }

  static async regenerateKey(input: RegenerateKeyInput): Promise<{ apiKey: string }> {
    // Look up by email only — never reveal whether the email exists or not
    const merchant = await merchantRepository.findOne({ where: { email: input.email } });
    if (!merchant || !merchant.recoveryCodeHash) {
      throw new ApiError(401, 'Invalid credentials', false);
    }

    const incomingHash = crypto.createHash('sha256').update(input.recoveryCode).digest('hex');
    if (merchant.recoveryCodeHash !== incomingHash) {
      throw new ApiError(401, 'Invalid credentials', false);
    }

    // Recovery code verified — generate a new API key (recovery code is never rotated)
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

