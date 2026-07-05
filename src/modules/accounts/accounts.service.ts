import { AppDataSource } from '../../config';
import { Account, AccountStatus, KycTier } from '../../entities/Account';
import * as nombaApi from '../../nomba/nomba.api';
import { ApiError } from '../../middlewares';
import { CreateAccountInput, UpdateAccountInput } from './accounts.validation';
import { v4 as uuidv4 } from 'uuid';

const accountRepository = AppDataSource.getRepository(Account);

export class AccountsService {
  static async provisionAccount(input: CreateAccountInput & { merchantId: string }): Promise<Account> {
    // Generate our unique reference BEFORE calling Nomba
    const nombaAccountRef = `ACC-${uuidv4().replace(/-/g, '').slice(0, 20).toUpperCase()}`;

    const accountName = `${input.firstName} ${input.lastName}`;

    try {
      // Call Nomba API to provision virtual account
      const response = await nombaApi.createVirtualAccount({
        accountRef: nombaAccountRef,
        accountName: accountName,
        currency: 'NGN',
        bvn: input.bvn,
      });

      const nombaData = response.data.data;

      // Save to our DB with full Nomba response
      const account = accountRepository.create({
        merchantId: input.merchantId,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        bvn: input.bvn,
        nin: input.nin,
        kycTier: KycTier.TIER_1,
        nombaAccountRef,
        nombaAccountNumber: nombaData.bankAccountNumber,
        nombaBankName: nombaData.bankName || 'Nomba MFB',
        nombaBankCode: nombaData.bankCode || '100029', // Default Nomba bank code
        nombaAccountName: nombaData.bankAccountName || nombaData.accountName || accountName,
        nombaProvisioningResponse: nombaData,
        status: AccountStatus.ACTIVE,
      });

      return await accountRepository.save(account);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.description || error.response?.data?.message || error.message;
      throw new ApiError(status, `Nomba API Provisioning Failed: ${message}`, true);
    }
  }

  static async getAccountById(id: string, merchantId: string): Promise<Account> {
    const account = await accountRepository.findOne({ where: { id, merchantId } });
    if (!account) {
      throw new ApiError(404, 'Account not found', true);
    }
    return account;
  }

  static async updateAccount(id: string, merchantId: string, input: UpdateAccountInput): Promise<Account> {
    const account = await this.getAccountById(id, merchantId);

    if (input.accountName) {
      try {
        const accountHolderId = (account.nombaProvisioningResponse as any)?.accountHolderId;
        if (!accountHolderId) throw new ApiError(500, 'Account holder ID missing from provisioned account data', true);
        await nombaApi.updateVirtualAccount(accountHolderId, { accountName: input.accountName });
        account.nombaAccountName = input.accountName;
      } catch (error: any) {
        const message = error.response?.data?.message || error.message;
        throw new ApiError(error.response?.status || 500, `Nomba API Update Failed: ${message}`, true);
      }
    }

    return await accountRepository.save(account);
  }

  static async suspendAccount(id: string, merchantId: string): Promise<Account> {
    const account = await this.getAccountById(id, merchantId);
    if (account.status === AccountStatus.SUSPENDED) return account;

    try {
      const accountHolderId = (account.nombaProvisioningResponse as any)?.accountHolderId;
      if (!accountHolderId) throw new ApiError(500, 'Account holder ID missing from provisioned account data', true);
      await nombaApi.suspendVirtualAccount(accountHolderId);
      account.status = AccountStatus.SUSPENDED;
      account.suspendedAt = new Date();
      return await accountRepository.save(account);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      throw new ApiError(error.response?.status || 500, `Nomba API Suspension Failed: ${message}`, true);
    }
  }

  static async reactivateAccount(id: string, merchantId: string): Promise<Account> {
    const account = await this.getAccountById(id, merchantId);
    if (account.status === AccountStatus.ACTIVE) return account;

    try {
      const accountHolderId = (account.nombaProvisioningResponse as any)?.accountHolderId;
      if (!accountHolderId) throw new ApiError(500, 'Account holder ID missing from provisioned account data', true);
      await nombaApi.unsuspendVirtualAccount(accountHolderId);
      account.status = AccountStatus.ACTIVE;
      account.reopenedAt = new Date();
      return await accountRepository.save(account);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      throw new ApiError(error.response?.status || 500, `Nomba API Reactivation Failed: ${message}`, true);
    }
  }

  static async closeAccount(id: string, merchantId: string): Promise<Account> {
    const account = await this.getAccountById(id, merchantId);
    try {
      if (account.status !== AccountStatus.SUSPENDED) {
        const accountHolderId = (account.nombaProvisioningResponse as any)?.accountHolderId;
        if (!accountHolderId) throw new ApiError(500, 'Account holder ID missing from provisioned account data', true);
        await nombaApi.suspendVirtualAccount(accountHolderId);
      }
      account.status = AccountStatus.CLOSED;
      account.closedAt = new Date();
      return await accountRepository.save(account);
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      throw new ApiError(error.response?.status || 500, `Nomba API Closure Failed: ${message}`, true);
    }
  }

  static async listAccounts(merchantId: string): Promise<Account[]> {
    return await accountRepository.find({ where: { merchantId }, order: { createdAt: 'DESC' } });
  }
}
