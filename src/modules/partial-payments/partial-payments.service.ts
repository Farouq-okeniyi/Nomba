import { AppDataSource } from '../../config';
import { PaymentExpectation, PaymentExpectationStatus } from '../../entities/payment-expectation.entity';
import { PaymentInstallment } from '../../entities/payment-installment.entity';
import { Account } from '../../entities/Account';
import { Not } from 'typeorm';
import * as nombaApi from '../../nomba/nomba.api';
import { ApiError } from '../../middlewares';
import { CreateExpectationInput, UpdateExpectationInput } from './partial-payments.validation';

// ─── Repositories ─────────────────────────────────────────────────────────────
const expectationRepository = AppDataSource.getRepository(PaymentExpectation);
const installmentRepository = AppDataSource.getRepository(PaymentInstallment);
const accountRepository = AppDataSource.getRepository(Account);

// NOTE: This service is a stub updated for Phase 1 entity changes.
// Full merchantId scoping and accountId wiring will be done in Phase 5.

export class PartialPaymentsService {
  static async createExpectation(input: CreateExpectationInput): Promise<PaymentExpectation> {
    const expectation = expectationRepository.create({
      reference: input.reference,
      merchantId: input.merchantId,
      accountId: input.accountId,
      expectedAmount: input.expectedAmount,
      amountPaid: 0,
      outstanding: input.expectedAmount,
      status: PaymentExpectationStatus.PENDING,
    });

    return await expectationRepository.save(expectation);
  }

  static async updateExpectation(id: string, merchantId: string, input: UpdateExpectationInput): Promise<PaymentExpectation> {
    // Load the expectation
    const expectation = await this.getExpectationById(id, merchantId);

    // Cannot update settled expectations
    if (expectation.status === PaymentExpectationStatus.SETTLED) {
      throw new ApiError(400, 'Cannot update a settled expectation', true);
    }

    // Find the associated account to get the Nomba reference
    const account = await accountRepository.findOne({ where: { id: expectation.accountId } });
    if (!account) {
      throw new ApiError(404, 'Account not found for expectation', true);
    }

    // Step 1: Call Nomba FIRST — if this fails, bail immediately, no DB changes
    try {
      await nombaApi.updateVirtualAccount(account.nombaAccountRef, { amount: input.expectedAmount });
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      throw new ApiError(error.response?.status || 500, `Nomba API Update Expected Amount Failed: ${message}`, true);
    }

    // Step 2: Nomba succeeded (or not needed) — now update DB in a transaction
    return await AppDataSource.transaction(async (manager) => {
      const txExpectationRepo = manager.getRepository(PaymentExpectation);

      // Lock the row for update
      const lockedExpectation = await txExpectationRepo.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedExpectation) {
        throw new ApiError(404, 'Payment expectation not found', true);
      }

      lockedExpectation.expectedAmount = input.expectedAmount;
      lockedExpectation.outstanding = input.expectedAmount - Number(lockedExpectation.amountPaid);

      return await txExpectationRepo.save(lockedExpectation);
    });
  }

  static async listExpectations(merchantId: string): Promise<PaymentExpectation[]> {
    return await expectationRepository.find({
      where: { merchantId },
      order: { createdAt: 'DESC' },
    });
  }

  static async getExpectationById(id: string, merchantId: string): Promise<PaymentExpectation> {
    const expectation = await expectationRepository.findOne({
      where: { id, merchantId },
    });
    if (!expectation) {
      throw new ApiError(404, 'Payment expectation not found', true);
    }
    return expectation;
  }

  static async getInstallments(expectationId: string, merchantId: string): Promise<PaymentInstallment[]> {
    // Verify ownership first
    await this.getExpectationById(expectationId, merchantId);

    return await installmentRepository.find({
      where: { paymentExpectationId: expectationId, merchantId },
      order: { createdAt: 'ASC' },
    });
  }
}

