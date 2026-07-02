import { AppDataSource } from '../../config';
import { PaymentExpectation } from '../../entities/payment-expectation.entity';
import { PaymentInstallment } from '../../entities/payment-installment.entity';
import { ApiError } from '../../middlewares';
import { CreateExpectationInput } from './partial-payments.types';

const expectationRepository = AppDataSource.getRepository(PaymentExpectation);
const installmentRepository = AppDataSource.getRepository(PaymentInstallment);

export class PartialPaymentsService {
  static async createExpectation(input: CreateExpectationInput): Promise<PaymentExpectation> {
    const existing = await expectationRepository.findOneBy({ reference: input.reference });
    if (existing) {
      throw new ApiError(400, `Payment expectation with reference "${input.reference}" already exists`, true);
    }

    const expectation = expectationRepository.create({
      reference: input.reference,
      customerId: input.customerId,
      expectedAmount: input.expectedAmount,
      amountReceived: 0,
      dueDate: input.dueDate,
    });

    return await expectationRepository.save(expectation);
  }

  static async listExpectations(status?: string): Promise<PaymentExpectation[]> {
    const query: any = {};
    if (status) {
      query.status = status;
    }
    return await expectationRepository.find({
      where: query,
      order: { createdAt: 'DESC' },
    });
  }

  static async getExpectationById(id: string): Promise<PaymentExpectation> {
    const expectation = await expectationRepository.findOne({
      where: { id },
      relations: { installments: true },
    });

    if (!expectation) {
      throw new ApiError(404, 'Payment expectation not found', true);
    }

    return expectation;
  }

  static async getInstallments(expectationId: string): Promise<PaymentInstallment[]> {
    // Verify expectation exists
    await this.getExpectationById(expectationId);

    return await installmentRepository.find({
      where: { expectationId },
      order: { paidAt: 'DESC' },
    });
  }
}
