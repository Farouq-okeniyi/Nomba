import { AppDataSource } from '../../config';
import { MisplacedPayment, MisplacedPaymentStatus, MisplacedPaymentResolution } from '../../entities/misplaced-payment.entity';
import { Transaction, TransactionType, TransactionStatus } from '../../entities/Transaction';
import crypto from 'crypto';
import * as nombaApi from '../../nomba/nomba.api';
import { ApiError } from '../../middlewares';
import { v4 as uuidv4 } from 'uuid';
import { Account, AccountStatus } from '../../entities/Account';
import { processCorePayment } from '../webhook/webhook.service';
import { WebhookPayload } from '../webhook/webhook.validation';
import { writeAuditLog } from '../../extension/audit';

const misplacedRepository = AppDataSource.getRepository(MisplacedPayment);
const accountRepository = AppDataSource.getRepository(Account);
const transactionRepository = AppDataSource.getRepository(Transaction);

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
      senderAccountNumber?: string;
      senderBankCode?: string;
    },
  ): Promise<MisplacedPayment> {
    const payment = await this.getPaymentById(id, merchantId);

    if (payment.status === MisplacedPaymentStatus.RESOLVED) {
      throw new ApiError(400, 'Payment has already been resolved', true);
    }

    if (input.action === 'REFUND') {
      if (!input.senderAccountNumber || !input.senderBankCode) {
        throw new ApiError(400, 'REFUND requires senderAccountNumber and senderBankCode', true);
      }

      // Generate merchantTxRef BEFORE calling Nomba
      const merchantTxRef = `REFUND-${crypto.randomUUID()}`;

      // Create PENDING OUTBOUND transaction BEFORE Nomba call
      // accountId is null — merchant-level outbound transaction
      const transaction = await transactionRepository.save(transactionRepository.create({
        merchantId: payment.merchantId!,
        accountId: null,
        merchantTxRef,
        type: TransactionType.OUTBOUND,
        amount: payment.amount,
        currency: 'NGN',
        status: TransactionStatus.PENDING,
        narration: `Refund: misplaced payment ${payment.id}`,
        rawWebhookPayload: null,
      }));

      // Call Nomba transfer — operator owns the decision and provided details
      try {
        await nombaApi.initiateTransfer({
          amount: payment.amount,
          accountNumber: input.senderAccountNumber,
          bankCode: input.senderBankCode,
          accountName: payment.senderName || 'Unknown Sender',
          narration: `Refund: misplaced payment ${payment.id}`,
          merchantTxRef,
        }, uuidv4());

        // Update misplaced payment record
        payment.refundMerchantTxRef = merchantTxRef;
      } catch (err: any) {
        // Mark transaction as failed — Nomba call failed
        transaction.status = TransactionStatus.FAILED;
        await transactionRepository.save(transaction);
        throw new ApiError(500, `Refund transfer failed: ${err.message}`, true);
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

    const updatedPayment = await misplacedRepository.save(payment);

    if (input.action === 'REROUTE') {
      await writeAuditLog({
        merchantId: updatedPayment.merchantId!,
        entityType: 'MisplacedPayment',
        entityId: updatedPayment.id,
        action: 'PAYMENT_REROUTED',
        previousState: { status: 'PENDING' },
        newState: {
          status: 'RESOLVED',
          resolutionAction: 'REROUTED',
          reroutedToAccountId: input.targetAccountId,
          resolvedBy: input.resolvedBy,
          resolvedAt: updatedPayment.resolvedAt,
        },
        triggeredBy: `API:${updatedPayment.merchantId}`,
      });
    } else if (input.action === 'REFUND') {
      await writeAuditLog({
        merchantId: updatedPayment.merchantId!,
        entityType: 'MisplacedPayment',
        entityId: updatedPayment.id,
        action: 'PAYMENT_REFUNDED',
        previousState: { status: 'PENDING' },
        newState: {
          status: 'RESOLVED',
          resolutionAction: 'REFUNDED',
          refundMerchantTxRef: updatedPayment.refundMerchantTxRef,
          resolvedBy: input.resolvedBy,
          resolvedAt: updatedPayment.resolvedAt,
        },
        triggeredBy: `API:${updatedPayment.merchantId}`,
      });
    } else if (input.action === 'WRITE_OFF') {
      await writeAuditLog({
        merchantId: updatedPayment.merchantId!,
        entityType: 'MisplacedPayment',
        entityId: updatedPayment.id,
        action: 'PAYMENT_WRITTEN_OFF',
        previousState: { status: 'PENDING' },
        newState: {
          status: 'RESOLVED',
          resolutionAction: 'WRITTEN_OFF',
          resolvedBy: input.resolvedBy,
          resolvedAt: updatedPayment.resolvedAt,
          note: input.note,
        },
        triggeredBy: `API:${updatedPayment.merchantId}`,
      });
    }

    return updatedPayment;
  }
}
