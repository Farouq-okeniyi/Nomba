import { Merchant } from '../../entities/Merchant';

export interface MerchantDto {
  id: string;
  object: 'merchant';
  businessName: string;
  email: string;
  phone: string | null;
  webhookUrl: string | null;
  status: string;
}

export const toMerchantDto = (merchant: Merchant): MerchantDto => {
  return {
    id: merchant.id,
    object: 'merchant',
    businessName: merchant.businessName,
    email: merchant.email,
    phone: merchant.phone || null,
    webhookUrl: merchant.webhookUrl || null,
    status: merchant.status,
  };
};
