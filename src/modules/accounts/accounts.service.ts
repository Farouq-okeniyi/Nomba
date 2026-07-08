import { AppDataSource } from '../../config';
import { Account, AccountStatus, KycTier } from '../../entities/Account';
import { writeAuditLog } from '../../extension/audit';
import { PaymentExpectation, PaymentExpectationStatus } from '../../entities/payment-expectation.entity';
import { AuditLog } from '../../entities/AuditLog';
import { Not, In } from 'typeorm';
import * as nombaApi from '../../nomba/nomba.api';
import { ApiError } from '../../middlewares';
import { CreateAccountInput, UpdateAccountInput } from './accounts.validation';
import { v4 as uuidv4 } from 'uuid';

const accountRepository = AppDataSource.getRepository(Account);
const paymentExpectationRepo = AppDataSource.getRepository(PaymentExpectation);
const auditLogRepo = AppDataSource.getRepository(AuditLog);

export class AccountsService {
  static async provisionAccount(input: CreateAccountInput & { merchantId: string }): Promise<Account> {
    // Generate our unique reference BEFORE calling Nomba
    const nombaAccountRef = `ACC-${uuidv4().replace(/-/g, '').slice(0, 20).toUpperCase()}`;

    const accountName = `${input.firstName} ${input.lastName}`;

    try {
      // Call Nomba API to provision virtual account
      const nombaPayload: any = {
        accountRef: nombaAccountRef,
        accountName: accountName,
        currency: 'NGN',
        bvn: input.bvn,
      };

      if (input.expectedAmount !== undefined) {
        nombaPayload.amount = input.expectedAmount;
      }

      const response = await nombaApi.createVirtualAccount(nombaPayload);

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

      const savedAccount = await accountRepository.save(account);

      await writeAuditLog({
        merchantId: savedAccount.merchantId,
        entityType: 'Account',
        entityId: savedAccount.id,
        action: 'ACCOUNT_CREATED',
        previousState: undefined,
        newState: savedAccount,
        triggeredBy: `API:${savedAccount.merchantId}`,
      });

      if (input.expectedAmount !== undefined) {
        // Auto-create PaymentExpectation
        const expectation = paymentExpectationRepo.create({
          merchantId: savedAccount.merchantId,
          accountId: savedAccount.id,
          reference: `AUTO-${savedAccount.nombaAccountRef}`,
          expectedAmount: input.expectedAmount,
          amountPaid: 0,
          outstanding: input.expectedAmount,
          status: PaymentExpectationStatus.PENDING,
        });
        await paymentExpectationRepo.save(expectation);

        // Log to AuditLog
        await writeAuditLog({
          merchantId: expectation.merchantId,
          entityType: 'PaymentExpectation',
          entityId: expectation.id,
          action: 'EXPECTATION_AUTO_CREATED',
          previousState: undefined,
          newState: expectation,
          triggeredBy: 'SYSTEM',
        });

        (savedAccount as any).expectedAmount = input.expectedAmount;
      }

      return savedAccount;
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
    const expectation = await paymentExpectationRepo.findOne({
      where: {
        accountId: account.id,
      },
      order: { createdAt: 'DESC' }
    });
    if (expectation) {
      (account as any).expectedAmount = expectation.expectedAmount;
    }
    return account;
  }

  static async updateAccount(id: string, merchantId: string, input: UpdateAccountInput): Promise<Account> {
    const account = await this.getAccountById(id, merchantId);
    const previousAccount = { ...account };

    if (input.accountName) {
      try {
        await nombaApi.updateVirtualAccount(account.nombaAccountRef, { accountName: input.accountName });
        account.nombaAccountName = input.accountName;
      } catch (error: any) {
        const message = error.response?.data?.message || error.message;
        throw new ApiError(error.response?.status || 500, `Nomba API Update Failed: ${message}`, true);
      }
    }

    if (input.expectedAmount !== undefined) {
      // Step 1: Call Nomba FIRST — if this fails, bail immediately, no DB changes
      try {
        await nombaApi.updateVirtualAccount(account.nombaAccountRef, { amount: input.expectedAmount });
      } catch (error: any) {
        const message = error.response?.data?.message || error.message;
        throw new ApiError(error.response?.status || 500, `Nomba API Update Expected Amount Failed: ${message}`, true);
      }

      // Step 2: Nomba succeeded — now update DB in a transaction
      await AppDataSource.transaction(async (manager) => {
        const expectationRepo = manager.getRepository(PaymentExpectation);
        const activeExpectation = await expectationRepo.findOne({
          where: {
            accountId: account.id,
            status: Not(PaymentExpectationStatus.SETTLED),
          },
          order: { createdAt: 'DESC' },
        });

        if (activeExpectation) {
          console.log(`[AccountsService] Updating existing expectation ${activeExpectation.id} with expectedAmount ${input.expectedAmount}`);
          const previousAmount = activeExpectation.expectedAmount;
          const previousOutstanding = activeExpectation.outstanding;
          
          activeExpectation.expectedAmount = input.expectedAmount!;
          activeExpectation.outstanding = input.expectedAmount! - Number(activeExpectation.amountPaid);
          await expectationRepo.save(activeExpectation);

          await writeAuditLog({
            merchantId: activeExpectation.merchantId,
            entityType: 'PaymentExpectation',
            entityId: activeExpectation.id,
            action: 'EXPECTED_AMOUNT_UPDATED',
            previousState: { expectedAmount: previousAmount, outstanding: previousOutstanding },
            newState: { expectedAmount: activeExpectation.expectedAmount, outstanding: activeExpectation.outstanding },
            triggeredBy: `API:${activeExpectation.merchantId}`,
          });
        } else {
          console.log(`[AccountsService] No active expectation found for account ${account.id}. Creating new one with expectedAmount ${input.expectedAmount}`);
          const newExpectation = expectationRepo.create({
            merchantId: account.merchantId,
            accountId: account.id,
            reference: `AUTO-${account.nombaAccountRef}`,
            expectedAmount: input.expectedAmount!,
            amountPaid: 0,
            outstanding: input.expectedAmount!,
            status: PaymentExpectationStatus.PENDING,
          });
          await expectationRepo.save(newExpectation);
        }
      });
    }

    const updatedAccount = await accountRepository.save(account);

    await writeAuditLog({
      merchantId: updatedAccount.merchantId,
      entityType: 'Account',
      entityId: updatedAccount.id,
      action: 'ACCOUNT_UPDATED',
      previousState: previousAccount,
      newState: updatedAccount,
      triggeredBy: `API:${updatedAccount.merchantId}`,
    });

    return updatedAccount;
  }

  static async suspendAccount(id: string, merchantId: string): Promise<Account> {
    const account = await this.getAccountById(id, merchantId);
    if (account.status === AccountStatus.SUSPENDED) return account;

    try {
      const accountHolderId = (account.nombaProvisioningResponse as any)?.accountHolderId;
      if (!accountHolderId) throw new Error('accountHolderId missing from provisioning response');
      await nombaApi.suspendVirtualAccount(accountHolderId);
      account.status = AccountStatus.SUSPENDED;
      account.suspendedAt = new Date();
      const updatedAccount = await accountRepository.save(account);

      await writeAuditLog({
        merchantId: updatedAccount.merchantId,
        entityType: 'Account',
        entityId: updatedAccount.id,
        action: 'ACCOUNT_SUSPENDED',
        previousState: { status: 'ACTIVE' },
        newState: { status: 'SUSPENDED', suspendedAt: updatedAccount.suspendedAt },
        triggeredBy: `API:${updatedAccount.merchantId}`,
      });

      return updatedAccount;
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
      if (!accountHolderId) throw new Error('accountHolderId missing from provisioning response');
      await nombaApi.unsuspendVirtualAccount(accountHolderId);
      account.status = AccountStatus.ACTIVE;
      account.reopenedAt = new Date();
      const updatedAccount = await accountRepository.save(account);

      await writeAuditLog({
        merchantId: updatedAccount.merchantId,
        entityType: 'Account',
        entityId: updatedAccount.id,
        action: 'ACCOUNT_REACTIVATED',
        previousState: { status: 'SUSPENDED' },
        newState: { status: 'ACTIVE', reopenedAt: updatedAccount.reopenedAt },
        triggeredBy: `API:${updatedAccount.merchantId}`,
      });

      return updatedAccount;
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      throw new ApiError(error.response?.status || 500, `Nomba API Reactivation Failed: ${message}`, true);
    }
  }

  static async listAccounts(merchantId: string): Promise<Account[]> {
    const accounts = await accountRepository.find({ where: { merchantId }, order: { createdAt: 'DESC' } });
    
    if (accounts.length === 0) return accounts;

    const accountIds = accounts.map(a => a.id);
    const expectations = await paymentExpectationRepo.find({
      where: {
        accountId: In(accountIds),
      },
      order: { createdAt: 'DESC' }
    });

    for (const acc of accounts) {
      const expectation = expectations.find(e => e.accountId === acc.id);
      if (expectation) {
        (acc as any).expectedAmount = expectation.expectedAmount;
      }
    }

    return accounts;
  }
}
