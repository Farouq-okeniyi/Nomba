import { AppDataSource } from '../../config';
import { MisplacedPayment, MisplacedPaymentStatus, MisplacedPaymentResolution } from '../../entities/misplaced-payment.entity';
import * as nombaApi from '../../nomba/nomba.api';
import { ApiError } from '../../middlewares';
import { v4 as uuidv4 } from 'uuid';
import { Account, AccountStatus } from '../../entities/Account';
import { processCorePayment } from '../webhook/webhook.service';
import { WebhookPayload } from '../webhook/webhook.validation';

// NOTE: This is a Phase-1-compatible stub. Full merchantId scoping, reroute logic,
// and AuditLog integration will be completed in Phase 5.

const misplacedRepository = AppDataSource.getRepository(MisplacedPayment);
const accountRepository = AppDataSource.getRepository(Account);

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
      refundAccountNumber?: string;
      refundBankCode?: string;
      refundAccountName?: string;
    },
  ): Promise<MisplacedPayment> {
    const payment = await this.getPaymentById(id, merchantId);

    if (payment.status === MisplacedPaymentStatus.RESOLVED) {
      throw new ApiError(400, 'Payment has already been resolved', true);
    }

    if (input.action === 'REFUND') {
      if (!input.refundBankCode || !input.refundAccountNumber || !input.refundAccountName) {
        throw new ApiError(400, 'Cannot refund: missing destination bank details', true);
      }

      const refundRef = `REF-${uuidv4().replace(/-/g, '').slice(0, 16)}-${Date.now()}`;
      try {
        await nombaApi.initiateTransfer({
          amount: payment.amount,
          bankCode: input.refundBankCode,
          accountNumber: input.refundAccountNumber,
          accountName: input.refundAccountName,
          senderName: 'Merchant Refund',
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

      const targetAccount = await accountRepository.findOne({ where: { id: input.targetAccountId } });
      if (!targetAccount) {
        throw new ApiError(404, 'Target account not found', true);
      }
      if (targetAccount.status !== AccountStatus.ACTIVE) {
        throw new ApiError(400, `Target account is ${targetAccount.status} and cannot receive funds`, true);
      }

      const generatedRequestId = `REROUTE-${uuidv4()}`;
      await processCorePayment(
        targetAccount, 
        payment.amount, 
        payment.rawWebhookPayload as WebhookPayload, 
        generatedRequestId
      );

      payment.reroutedToAccountId = input.targetAccountId;
    }

    payment.status = MisplacedPaymentStatus.RESOLVED;

    const actionMap: Record<string, MisplacedPaymentResolution> = {
      REROUTE: MisplacedPaymentResolution.REROUTED,
      REFUND: MisplacedPaymentResolution.REFUNDED,
      WRITE_OFF: MisplacedPaymentResolution.WRITTEN_OFF,
    };
    payment.resolutionAction = actionMap[input.action];
    payment.resolutionNote = input.note;
    payment.resolvedBy = input.resolvedBy;
    payment.resolvedAt = new Date();

    return await misplacedRepository.save(payment);
  }
}
