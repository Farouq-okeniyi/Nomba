import { AppDataSource } from '../../config';
import { PaymentExpectation, PaymentExpectationStatus } from '../../entities/payment-expectation.entity';
import { PaymentInstallment } from '../../entities/payment-installment.entity';
import { ApiError } from '../../middlewares';
import { CreateExpectationInput } from './partial-payments.types';

// ─── Repositories ─────────────────────────────────────────────────────────────
const expectationRepository = AppDataSource.getRepository(PaymentExpectation);
const installmentRepository = AppDataSource.getRepository(PaymentInstallment);

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
