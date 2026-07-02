import { AppDataSource } from '../../config';
import { VirtualAccount, VirtualAccountStatus } from '../../entities/virtual-account.entity';
import * as nombaApi from '../../nomba/nomba.api';
import { ApiError } from '../../middlewares';
import { CreateAccountInput, UpdateAccountInput } from './accounts.types';

const accountRepository = AppDataSource.getRepository(VirtualAccount);

export class AccountsService {
  static async provisionAccount(input: CreateAccountInput): Promise<VirtualAccount> {
    try {
      // 1. Call Nomba API to provision
      const response = await nombaApi.createVirtualAccount({
        accountName: input.accountName,
        customerId: input.customerId,
        bvn: input.bvn,
      });

      const nombaData = response.data.data;

      // 2. Save in database
      const account = accountRepository.create({
        nombaAccountId: nombaData.accountId,
        accountNumber: nombaData.accountNumber,
        accountName: nombaData.accountName,
        customerId: input.customerId,
        status: VirtualAccountStatus.ACTIVE,
        kycTier: 1,
        metadata: nombaData,
      });

      return await accountRepository.save(account);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.description || error.response?.data?.message || error.message;
      throw new ApiError(status, `Nomba API Provisioning Failed: ${message}`, true);
    }
  }

  static async getAccountById(id: string): Promise<VirtualAccount> {
    const account = await accountRepository.findOneBy({ id });
    if (!account) {
      throw new ApiError(404, 'Virtual Account not found', true);
    }
    return account;
  }

  static async updateAccount(id: string, input: UpdateAccountInput): Promise<VirtualAccount> {
    const account = await this.getAccountById(id);

    try {
      // Update metadata on Nomba if accountName changed
      if (input.accountName && input.accountName !== account.accountName) {
        await nombaApi.updateVirtualAccount(account.nombaAccountId, {
          accountName: input.accountName,
        });
        account.accountName = input.accountName;
      }

      if (input.kycTier !== undefined) {
        account.kycTier = input.kycTier;
      }

      return await accountRepository.save(account);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message;
      throw new ApiError(status, `Nomba API Update Failed: ${message}`, true);
    }
  }

  static async suspendAccount(id: string): Promise<VirtualAccount> {
    const account = await this.getAccountById(id);
    if (account.status === VirtualAccountStatus.SUSPENDED) {
      return account;
    }

    try {
      await nombaApi.suspendVirtualAccount(account.nombaAccountId);
      account.status = VirtualAccountStatus.SUSPENDED;
      return await accountRepository.save(account);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message;
      throw new ApiError(status, `Nomba API Suspension Failed: ${message}`, true);
    }
  }

  static async reactivateAccount(id: string): Promise<VirtualAccount> {
    const account = await this.getAccountById(id);
    if (account.status === VirtualAccountStatus.ACTIVE) {
      return account;
    }

    try {
      await nombaApi.unsuspendVirtualAccount(account.nombaAccountId);
      account.status = VirtualAccountStatus.ACTIVE;
      return await accountRepository.save(account);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message;
      throw new ApiError(status, `Nomba API Reactivation Failed: ${message}`, true);
    }
  }

  static async closeAccount(id: string): Promise<VirtualAccount> {
    const account = await this.getAccountById(id);
    // Nomba doesn't support direct closure via endpoint sometimes, so we suspend first and mark CLOSED locally
    try {
      if (account.status !== VirtualAccountStatus.SUSPENDED) {
        await nombaApi.suspendVirtualAccount(account.nombaAccountId);
      }
      account.status = VirtualAccountStatus.CLOSED;
      return await accountRepository.save(account);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message;
      throw new ApiError(status, `Nomba API Closure/Suspension Failed: ${message}`, true);
    }
  }

  static async listAccounts(): Promise<VirtualAccount[]> {
    return await accountRepository.find({ order: { createdAt: 'DESC' } });
  }
}
