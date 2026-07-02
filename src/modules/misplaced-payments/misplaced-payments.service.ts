import { AppDataSource } from '../../config';
import { MisplacedPayment, MisplacedPaymentStatus } from '../../entities/misplaced-payment.entity';
import { PaymentExpectation, ExpectationStatus } from '../../entities/payment-expectation.entity';
import { PaymentInstallment } from '../../entities/payment-installment.entity';
import * as nombaApi from '../../nomba/nomba.api';
import { ApiError } from '../../middlewares';
import { UpdateMisplacedPaymentInput, RecoverMisplacedPaymentInput } from './misplaced-payments.types';

const misplacedRepository = AppDataSource.getRepository(MisplacedPayment);
const expectationRepository = AppDataSource.getRepository(PaymentExpectation);

export class MisplacedPaymentsService {
  static async listPayments(): Promise<MisplacedPayment[]> {
    return await misplacedRepository.find({ order: { createdAt: 'DESC' } });
  }

  static async getPaymentById(id: string): Promise<MisplacedPayment> {
    const payment = await misplacedRepository.findOneBy({ id });
    if (!payment) {
      throw new ApiError(404, 'Misplaced Payment record not found', true);
    }
    return payment;
  }

  static async holdPayment(id: string, input: UpdateMisplacedPaymentInput): Promise<MisplacedPayment> {
    const payment = await this.getPaymentById(id);
    if (payment.status !== MisplacedPaymentStatus.UNMATCHED && payment.status !== MisplacedPaymentStatus.UNDER_REVIEW) {
      throw new ApiError(400, 'Only unmatched or under-review payments can be put on hold', true);
    }

    payment.status = MisplacedPaymentStatus.HELD;
    payment.notes = input.notes;
    payment.resolvedBy = input.resolvedBy;
    return await misplacedRepository.save(payment);
  }

  static async recoverPayment(id: string, input: RecoverMisplacedPaymentInput): Promise<MisplacedPayment> {
    const payment = await this.getPaymentById(id);
    if (payment.status === MisplacedPaymentStatus.RECOVERED || payment.status === MisplacedPaymentStatus.REFUNDED) {
      throw new ApiError(400, 'Payment has already been resolved', true);
    }

    // If recovering to an expectation (partial payment tracking)
    if (input.targetExpectationReference) {
      const expectation = await expectationRepository.findOne({
        where: { reference: input.targetExpectationReference },
        relations: { installments: true },
      });

      if (!expectation) {
        throw new ApiError(404, `Target payment expectation reference "${input.targetExpectationReference}" not found`, true);
      }

      // Check if installment already exists
      const existingInstallment = expectation.installments.find(inst => inst.nombaTransactionId === payment.nombaTransactionId);
      if (!existingInstallment) {
        await AppDataSource.transaction(async (manager) => {
          // Create installment
          const installment = manager.create(PaymentInstallment, {
            expectationId: expectation.id,
            amount: payment.amount,
            nombaTransactionId: payment.nombaTransactionId,
            paidAt: payment.createdAt,
          });
          await manager.save(installment);

          // Update running expectation amount
          expectation.amountReceived += payment.amount;

          // Re-evaluate expectation status
          if (expectation.amountReceived >= expectation.expectedAmount) {
            expectation.status = expectation.amountReceived === expectation.expectedAmount 
              ? ExpectationStatus.COMPLETE 
              : ExpectationStatus.OVERPAID;
          } else {
            expectation.status = ExpectationStatus.PARTIAL;
          }
          await manager.save(expectation);
        });
      }
    }

    payment.status = MisplacedPaymentStatus.RECOVERED;
    payment.notes = input.notes;
    payment.resolvedBy = input.resolvedBy;
    payment.resolvedAt = new Date();
    return await misplacedRepository.save(payment);
  }

  static async refundPayment(id: string, input: UpdateMisplacedPaymentInput): Promise<MisplacedPayment> {
    const payment = await this.getPaymentById(id);
    if (payment.status === MisplacedPaymentStatus.RECOVERED || payment.status === MisplacedPaymentStatus.REFUNDED) {
      throw new ApiError(400, 'Payment has already been resolved', true);
    }

    if (!payment.senderBank || !payment.accountNumber) {
      throw new ApiError(400, 'Cannot refund: missing original sender account details', true);
    }

    try {
      // Execute refund transfer via Nomba API
      await nombaApi.initiateTransfer({
        amount: payment.amount,
        bankCode: payment.senderBank, // Using standard 3-digit bank code stored in DB
        accountNumber: payment.accountNumber,
        narration: `REFUND: ${payment.nombaTransactionId}`,
        merchantTxRef: `REF-${payment.nombaTransactionId}-${Date.now()}`,
      });

      payment.status = MisplacedPaymentStatus.REFUNDED;
      payment.notes = input.notes;
      payment.resolvedBy = input.resolvedBy;
      payment.resolvedAt = new Date();
      return await misplacedRepository.save(payment);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const message = error.response?.data?.message || error.message;
      throw new ApiError(status, `Nomba API Payout Transfer Failed: ${message}`, true);
    }
  }
}
