import { Account, KycTier, AccountStatus } from '../../entities/Account';

export interface AccountDto {
  id: string;
  object: 'account';
  merchantId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  kycTier: KycTier;
  nombaAccountRef: string;
  nombaAccountNumber: string;
  nombaBankName: string;
  nombaBankCode: string | null;
  nombaAccountName: string;
  status: AccountStatus;
  suspendedAt: Date | null;
  closedAt: Date | null;
  reopenedAt: Date | null;
  expectedAmount?: number | null;
}

export const toAccountDto = (account: Account): AccountDto => {
  return {
    id: account.id,
    object: 'account',
    merchantId: account.merchantId,
    firstName: account.firstName,
    lastName: account.lastName,
    email: account.email,
    phone: account.phone,
    kycTier: account.kycTier,
    nombaAccountRef: account.nombaAccountRef,
    nombaAccountNumber: account.nombaAccountNumber,
    nombaBankName: account.nombaBankName,
    nombaBankCode: account.nombaBankCode || null,
    nombaAccountName: account.nombaAccountName,
    status: account.status,
    suspendedAt: account.suspendedAt || null,
    closedAt: account.closedAt || null,
    reopenedAt: account.reopenedAt || null,
    expectedAmount: (account as any).expectedAmount || null,
  };
};
