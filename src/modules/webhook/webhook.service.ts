import { AppDataSource } from '../../config';
import { logger } from '../../config';
import { WebhookPayload } from './webhook.validation';
import { WebhookEvent } from '../../entities/WebhookEvent';
import { Transaction, TransactionType, TransactionStatus } from '../../entities/Transaction';
import crypto from 'crypto';
import { Account, AccountStatus } from '../../entities/Account';
import { DisbursementRecipient, RecipientStatus } from '../../entities/DisbursementRecipient';
import { Disbursement, DisbursementStatus } from '../../entities/Disbursement';
import { PaymentExpectation, PaymentExpectationStatus } from '../../entities/payment-expectation.entity';
import { PaymentInstallment } from '../../entities/payment-installment.entity';
import { MisplacedPayment, MisplacedPaymentStatus, MisplacedPaymentReason } from '../../entities/misplaced-payment.entity';
import { Merchant } from '../../entities/Merchant';
import { OutboundService } from './outbound.service';
import { writeAuditLog } from '../../extension/audit';

const webhookEventRepo = AppDataSource.getRepository(WebhookEvent);
const transactionRepo = AppDataSource.getRepository(Transaction);
const accountRepo = AppDataSource.getRepository(Account);
const recipientRepo = AppDataSource.getRepository(DisbursementRecipient);
const disbursementRepo = AppDataSource.getRepository(Disbursement);
const expectationRepo = AppDataSource.getRepository(PaymentExpectation);
const installmentRepo = AppDataSource.getRepository(PaymentInstallment);
const misplacedRepo = AppDataSource.getRepository(MisplacedPayment);
const merchantRepo = AppDataSource.getRepository(Merchant);

export const handleWebhookEvent = async (payload: WebhookPayload): Promise<void> => {
  const { event_type, requestId, data } = payload;

  // 1. Save raw payload and enforce idempotency
  try {
    const event = webhookEventRepo.create({
      requestId,
      eventType: event_type,
      rawPayload: payload,
      processed: false,
      receivedAt: new Date(),
      signatureVerified: true,
    });
    await webhookEventRepo.save(event);
  } catch (error: any) {
    if (error.code === '23505' || error.message.includes('unique constraint')) {
      logger.info(`[Webhook] Duplicate requestId ${requestId} — ignoring`);
      return; // Idempotent success
    }
    throw error;
  }

  try {
    // 2. Route event
    switch (event_type) {
      case 'virtual_account.funded':
        await processPaymentSuccess(payload);
        break;
      case 'transfer.success':
        await processPayoutResult(payload, RecipientStatus.SUCCESS);
        break;
      case 'transfer.failed':
        await processPayoutResult(payload, RecipientStatus.FAILED);
        break;
      case 'payment_reversal':
        await processPaymentReversal(payload);
        break;
      default:
        logger.info(`[Webhook] Unhandled event type: ${event_type}`);
    }

    // Mark as processed
    await webhookEventRepo.update({ requestId }, { processed: true });

  } catch (error: any) {
    logger.error(`[Webhook] Failed processing ${requestId}: ${error.message}`);
    await webhookEventRepo.update({ requestId }, { processingError: error.message });
  }
};

async function processPaymentSuccess(payload: WebhookPayload) {
  const { data } = payload;
  const nombaAccountNumber = data.customer?.accountNumber;
  const amount = data.transaction.transactionAmount || 0;

  // Find Account
  const account = await accountRepo.findOne({ where: { nombaAccountNumber } });

  if (!account) {
    // Account not found at all — misplaced with reason ACCOUNT_NOT_FOUND
    const misplaced = misplacedRepo.create({
      merchantId: null,
      amount: amount,
      reason: MisplacedPaymentReason.ACCOUNT_NOT_FOUND,
      status: MisplacedPaymentStatus.PENDING,
      receivedOnAccountNumber: nombaAccountNumber || '',
      rawWebhookPayload: payload,
      receivedAt: new Date(data.transaction.time),
      senderName: data.customer?.senderName || '',
      senderBank: data.customer?.bankCode || '',
      senderAccountNumber: data.customer?.accountNumber || '',
    });
    // @ts-ignore - temporary ignore due to old fields in DB vs entity
    const savedMisplaced = await misplacedRepo.save(misplaced);
    
    await writeAuditLog({
      merchantId: savedMisplaced.merchantId || 'SYSTEM',
      entityType: 'MisplacedPayment',
      entityId: savedMisplaced.id,
      action: 'PAYMENT_MISPLACED',
      previousState: undefined,
      newState: {
        amount: savedMisplaced.amount,
        reason: savedMisplaced.reason,
        receivedOnAccountNumber: savedMisplaced.receivedOnAccountNumber,
      },
      triggeredBy: 'WEBHOOK',
    });

    return;
  }

  if (account.status === AccountStatus.SUSPENDED || account.status === AccountStatus.CLOSED) {
    // Account exists but is not active — misplaced with correct reason
    const reason = account.status === AccountStatus.SUSPENDED
      ? MisplacedPaymentReason.ACCOUNT_SUSPENDED
      : MisplacedPaymentReason.ACCOUNT_CLOSED;

    const misplaced = misplacedRepo.create({
      merchantId: account.merchantId,  // we know the merchant here
      accountId: account.id,
      amount: amount,
      reason,
      status: MisplacedPaymentStatus.PENDING,
      receivedOnAccountNumber: nombaAccountNumber || '',
      rawWebhookPayload: payload,
      receivedAt: new Date(data.transaction.time),
      senderName: data.customer?.senderName || '',
      senderBank: data.customer?.bankCode || '',
      senderAccountNumber: data.customer?.accountNumber || '',
    });
    // @ts-ignore - temporary ignore due to old fields in DB vs entity
    const savedMisplaced = await misplacedRepo.save(misplaced);

    await writeAuditLog({
      merchantId: savedMisplaced.merchantId || 'SYSTEM',
      entityType: 'MisplacedPayment',
      entityId: savedMisplaced.id,
      action: 'PAYMENT_MISPLACED',
      previousState: undefined,
      newState: {
        amount: savedMisplaced.amount,
        reason: savedMisplaced.reason,
        receivedOnAccountNumber: savedMisplaced.receivedOnAccountNumber,
      },
      triggeredBy: 'WEBHOOK',
    });

    // Fire outbound webhook to merchant so they know
    await OutboundService.fireWebhook(account.merchantId, 'payment.misplaced', {
      accountRef: account.nombaAccountRef,
      amount,
      reason,
    });
    return;
  }

  await processCorePayment(account, amount, payload, payload.requestId);
}

export async function processCorePayment(
  account: Account,
  amount: number,
  payload: WebhookPayload,
  nombaRequestId: string,
) {
  const merchantId = account.merchantId;
  const { data } = payload;

  // Create Transaction
  const transaction = transactionRepo.create({
    merchantId,
    accountId: account.id,
    merchantTxRef: `TX-IN-${crypto.randomUUID()}`,
    nombaRequestId: nombaRequestId,
    type: TransactionType.INBOUND,
    amount,
    status: TransactionStatus.SETTLED,
    senderName: data?.customer?.senderName || 'Unknown',
    senderBank: data?.customer?.bankName || 'Unknown',
    rawWebhookPayload: payload,
  });
  const savedTransaction = await transactionRepo.save(transaction);

  await writeAuditLog({
    merchantId: savedTransaction.merchantId,
    entityType: 'Transaction',
    entityId: savedTransaction.id,
    action: 'PAYMENT_RECEIVED',
    previousState: undefined,
    newState: {
      amount: savedTransaction.amount,
      status: savedTransaction.status,
      senderName: savedTransaction.senderName,
      senderBank: savedTransaction.senderBank,
      merchantTxRef: savedTransaction.merchantTxRef,
    },
    triggeredBy: 'WEBHOOK',
  });

  // Match Payment Expectation
  const expectation = await expectationRepo.findOne({
    where: [
      { accountId: account.id, status: PaymentExpectationStatus.PENDING },
      { accountId: account.id, status: PaymentExpectationStatus.PARTIAL },
    ],
    order: { createdAt: 'ASC' }, // oldest first — auto-created comes first
  });

  if (expectation) {
    await AppDataSource.transaction(async (manager) => {
      const expectationTxRepo = manager.getRepository(PaymentExpectation);
      const installmentTxRepo = manager.getRepository(PaymentInstallment);

      // Lock the row for update to prevent concurrent modification issues
      const lockedExpectation = await expectationTxRepo.findOne({
        where: { id: expectation.id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedExpectation) return;

      const previousRunningTotal = await installmentTxRepo.sum('amount', { paymentExpectationId: lockedExpectation.id }) || 0;
      const newRunningTotal = previousRunningTotal + amount;
      const outstandingAfter = Math.max(0, lockedExpectation.expectedAmount - newRunningTotal);

      const installment = installmentTxRepo.create({
        merchantId,
        paymentExpectationId: lockedExpectation.id,
        transactionId: transaction.id,
        amount,
        runningTotal: newRunningTotal,
        outstandingAfter,
      });
      await installmentTxRepo.save(installment);

      lockedExpectation.amountPaid += amount;
      lockedExpectation.outstanding = outstandingAfter;
      if (outstandingAfter === 0) {
        lockedExpectation.status = PaymentExpectationStatus.SETTLED;
        lockedExpectation.settledAt = new Date();
      } else {
        lockedExpectation.status = PaymentExpectationStatus.PARTIAL;
      }
      await expectationTxRepo.save(lockedExpectation);
    });
  }

  // Fire Outbound Webhook
  await OutboundService.fireWebhook(merchantId, 'payment.received', {
    accountRef: account.nombaAccountRef,
    transactionId: transaction.id,
    amount,
    status: transaction.status,
  });
}

async function processPayoutResult(payload: WebhookPayload, status: RecipientStatus) {
  const { data } = payload;
  const merchantTxRef = data.transaction.merchantTxRef;
  const nombaTxId = data.transaction.transactionId || (data.transaction as any).id;

  if (!merchantTxRef) return;

  const recipient = await recipientRepo.findOne({ where: { merchantTxRef }, relations: { disbursement: true } });
  
  if (!recipient) {
    // Check if it's a misplaced payment refund
    const misplacedPayment = await misplacedRepo.findOne({ where: { refundMerchantTxRef: merchantTxRef } });
    if (misplacedPayment) {
      const transaction = await transactionRepo.findOne({ where: { merchantTxRef } });
      if (transaction) {
        transaction.status = status === RecipientStatus.SUCCESS ? TransactionStatus.SETTLED : TransactionStatus.FAILED;
        transaction.rawWebhookPayload = payload;
        transaction.nombaTxId = nombaTxId;
        if (status === RecipientStatus.SUCCESS) {
          transaction.settledAt = new Date();
        }
        await transactionRepo.save(transaction);
      }
      return;
    }

    logger.warn(`[Webhook] Payout recipient ${merchantTxRef} not found.`);
    return;
  }

  // Update recipient status
  recipient.status = status;
  recipient.nombaStatus = status === RecipientStatus.SUCCESS ? 'SUCCESS' : 'FAILED';
  recipient.nombaRawResponse = payload;
  if (status === RecipientStatus.FAILED) {
    recipient.failureReason = data.transaction.responseCodeMessage || 'Transfer Failed';
  }
  await recipientRepo.save(recipient);

  // Update linked transaction status
  if (recipient.transactionId) {
    const transaction = await transactionRepo.findOne({ where: { id: recipient.transactionId } });
    if (transaction) {
      transaction.status = status === RecipientStatus.SUCCESS ? TransactionStatus.SETTLED : TransactionStatus.FAILED;
      transaction.rawWebhookPayload = payload;
      transaction.nombaTxId = nombaTxId;
      if (status === RecipientStatus.SUCCESS) {
        transaction.settledAt = new Date();
      }
      await transactionRepo.save(transaction);
    }
  }

  // Recompute Disbursement
  const disbursement = recipient.disbursement;
  if (disbursement) {
    if (status === RecipientStatus.SUCCESS) {
      disbursement.totalSuccess += 1;
      disbursement.totalPending -= 1;
    } else {
      disbursement.totalFailed += 1;
      disbursement.totalPending -= 1;
    }

    if (disbursement.totalPending === 0) {
      if (disbursement.totalFailed === disbursement.totalRecipients) {
        disbursement.status = DisbursementStatus.FAILED;
      } else if (disbursement.totalSuccess === disbursement.totalRecipients) {
        disbursement.status = DisbursementStatus.COMPLETED;
      } else {
        disbursement.status = DisbursementStatus.PARTIALLY_FAILED;
      }
      disbursement.completedAt = new Date();
    }
    await disbursementRepo.save(disbursement);

    await OutboundService.fireWebhook(disbursement.merchantId, 'disbursement.updated', {
      reference: disbursement.reference,
      status: disbursement.status,
      recipientReference: recipient.merchantTxRef,
      recipientStatus: recipient.status,
    });
  }
}

async function processPaymentReversal(payload: WebhookPayload) {
  logger.info('[Webhook] Payment Reversal received but handler is not yet fully implemented.');
}
