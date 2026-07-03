import { AppDataSource } from '../../config';
import { MisplacedPayment, MisplacedPaymentStatus, MisplacedPaymentResolution } from '../../entities/misplaced-payment.entity';
import * as nombaApi from '../../nomba/nomba.api';
import { ApiError } from '../../middlewares';
import { v4 as uuidv4 } from 'uuid';

// NOTE: This is a Phase-1-compatible stub. Full merchantId scoping, reroute logic,
// and AuditLog integration will be completed in Phase 5.

const misplacedRepository = AppDataSource.getRepository(MisplacedPayment);

export class MisplacedPaymentsService {
  static async listPayments(merchantId: string): Promise<MisplacedPayment[]> {
    return await misplacedRepository.find({
      where: { merchantId },
      order: { createdAt: 'DESC' },
    });
  }

  static async getPaymentById(id: string, merchantId: string): Promise<MisplacedPayment> {
    const payment = await misplacedRepository.findOne({ where: { id, merchantId } });
    if (!payment) {
      throw new ApiError(404, 'Misplaced Payment record not found', true);
    }
    return payment;
  }

  static async resolvePayment(
    id: string,
    merchantId: string,
    input: {
      action: 'REROUTE' | 'REFUND' | 'WRITE_OFF';
      note: string;
      resolvedBy: string;
      targetAccountId?: string;
    },
  ): Promise<MisplacedPayment> {
    const payment = await this.getPaymentById(id, merchantId);

    if (payment.status === MisplacedPaymentStatus.RESOLVED) {
      throw new ApiError(400, 'Payment has already been resolved', true);
    }

    if (input.action === 'REFUND') {
      if (!payment.senderBank || !payment.senderAccountNumber) {
        throw new ApiError(400, 'Cannot refund: missing original sender bank/account details', true);
      }

      const refundRef = `REF-${uuidv4().replace(/-/g, '').slice(0, 16)}-${Date.now()}`;
      try {
        await nombaApi.initiateTransfer({
          amount: payment.amount,
          bankCode: payment.senderBank,
          accountNumber: payment.senderAccountNumber,
          narration: `REFUND for misplaced payment`,
          merchantTxRef: refundRef,
        }, uuidv4());
        payment.refundMerchantTxRef = refundRef;
      } catch (error: any) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || error.message;
        throw new ApiError(status, `Nomba API Refund Transfer Failed: ${message}`, true);
      }
    }

    if (input.action === 'REROUTE') {
      if (!input.targetAccountId) {
        throw new ApiError(400, 'targetAccountId is required for REROUTE action', true);
      }
      payment.reroutedToAccountId = input.targetAccountId;
    }

    payment.status = MisplacedPaymentStatus.RESOLVED;
    payment.resolutionAction = MisplacedPaymentResolution[input.action as keyof typeof MisplacedPaymentResolution];
    payment.resolutionNote = input.note;
    payment.resolvedBy = input.resolvedBy;
    payment.resolvedAt = new Date();

    return await misplacedRepository.save(payment);
  }
}
