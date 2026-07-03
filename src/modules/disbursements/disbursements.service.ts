import { AppDataSource } from '../../config';
import { Disbursement, DisbursementStatus } from '../../entities/Disbursement';
import { DisbursementRecipient, RecipientStatus } from '../../entities/DisbursementRecipient';
import * as nombaApi from '../../nomba/nomba.api';
import { ApiError } from '../../middlewares';
import { logger } from '../../config';
import { CreateDisbursementInput } from './disbursements.types';
import { v4 as uuidv4 } from 'uuid';

const disbursementRepository = AppDataSource.getRepository(Disbursement);
const recipientRepository = AppDataSource.getRepository(DisbursementRecipient);

export class DisbursementsService {
  static async createAndExecuteBatch(input: CreateDisbursementInput & { merchantId: string }): Promise<Disbursement> {
    const totalAmount = input.items.reduce((sum, item) => sum + item.amount, 0);

    // 1. Validate balance
    try {
      const balanceResponse = await nombaApi.getWalletBalance();
      const data = balanceResponse.data?.data;
      const walletBalance = data?.walletBalance ?? data?.amount ?? 0;
      if (walletBalance < totalAmount) {
        throw new ApiError(
          400,
          `Insufficient Nomba wallet balance. Required: ₦${totalAmount / 100}, Available: ₦${walletBalance / 100}`,
          true,
        );
      }
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      logger.warn(`[Disbursements] Could not check Nomba wallet balance: ${error.message}. Proceeding anyway.`);
    }

    // 2. Create Disbursement batch
    const disbursement = disbursementRepository.create({
      merchantId: input.merchantId,
      reference: input.reference,
      narration: input.narration,
      totalAmount,
      totalRecipients: input.items.length,
      totalPending: input.items.length,
      status: DisbursementStatus.PROCESSING,
    });
    const saved = await disbursementRepository.save(disbursement);

    // 3. Create recipients — generate merchantTxRef BEFORE calling Nomba
    const recipients = input.items.map((item) => {
      const merchantTxRef = `DISB-${uuidv4().replace(/-/g, '').slice(0, 16)}-${Date.now()}`;
      return recipientRepository.create({
        merchantId: input.merchantId,
        disbursementId: saved.id,
        accountNumber: item.accountNumber,
        bankCode: item.bankCode,
        accountName: item.accountName || 'Unknown',
        amount: item.amount,
        narration: item.narration || input.narration,
        merchantTxRef,
        idempotencyKey: uuidv4(),
        status: RecipientStatus.PENDING,
      });
    });
    const savedRecipients = await recipientRepository.save(recipients);

    // 4. Execute payouts sequentially
    let successCount = 0;
    let failureCount = 0;

    for (const recipient of savedRecipients) {
      try {
        logger.info(`[Disbursements] Paying ₦${recipient.amount / 100} to ${recipient.accountNumber} (${recipient.bankCode})`);
        const transferResponse = await nombaApi.initiateTransfer({
          amount: recipient.amount,
          bankCode: recipient.bankCode,
          accountNumber: recipient.accountNumber,
          narration: recipient.narration || input.narration || `Payout`,
          merchantTxRef: recipient.merchantTxRef,
        }, recipient.idempotencyKey);

        const transferData = transferResponse.data?.data;
        recipient.status = RecipientStatus.SUCCESS;
        recipient.nombaTxId = transferData?.transactionId || transferData?.id || '';
        recipient.nombaStatus = 'SUCCESS';
        recipient.nombaRawResponse = transferData;
        successCount++;
      } catch (error: any) {
        const errorMsg = error.response?.data?.message || error.message;
        logger.error(`[Disbursements] Payout failed for ${recipient.id}: ${errorMsg}`);
        recipient.status = RecipientStatus.FAILED;
        recipient.failureReason = errorMsg;
        failureCount++;
      }
      await recipientRepository.save(recipient);
    }

    // 5. Update batch status and counters
    saved.totalSuccess = successCount;
    saved.totalFailed = failureCount;
    saved.totalPending = 0;

    if (successCount === saved.totalRecipients) {
      saved.status = DisbursementStatus.COMPLETED;
      saved.completedAt = new Date();
    } else if (failureCount === saved.totalRecipients) {
      saved.status = DisbursementStatus.FAILED;
    } else {
      saved.status = DisbursementStatus.PARTIALLY_FAILED;
    }

    return await disbursementRepository.save(saved);
  }

  static async listBatches(merchantId: string): Promise<Disbursement[]> {
    return await disbursementRepository.find({ where: { merchantId }, order: { createdAt: 'DESC' } });
  }

  static async getBatchById(id: string, merchantId: string): Promise<Disbursement> {
    const disbursement = await disbursementRepository.findOne({
      where: { id, merchantId },
      relations: { recipients: true },
    });
    if (!disbursement) throw new ApiError(404, 'Disbursement batch not found', true);
    return disbursement;
  }

  static async retryFailed(id: string, merchantId: string): Promise<Disbursement> {
    const disbursement = await this.getBatchById(id, merchantId);
    if (disbursement.status === DisbursementStatus.COMPLETED) {
      throw new ApiError(400, 'Batch is already fully completed', true);
    }

    const failedRecipients = disbursement.recipients.filter((r) => r.status === RecipientStatus.FAILED);
    if (failedRecipients.length === 0) throw new ApiError(400, 'No failed recipients to retry', true);

    let successCount = disbursement.totalSuccess;
    let failureCount = 0;

    for (const recipient of failedRecipients) {
      // Generate new merchantTxRef for retry
      const retryRef = `RETRY-${uuidv4().replace(/-/g, '').slice(0, 14)}-${Date.now()}`;
      try {
        recipient.idempotencyKey = uuidv4();
        const transferResponse = await nombaApi.initiateTransfer({
          amount: recipient.amount,
          bankCode: recipient.bankCode,
          accountNumber: recipient.accountNumber,
          narration: `Retry payout`,
          merchantTxRef: retryRef,
        }, recipient.idempotencyKey);
        const transferData = transferResponse.data?.data;
        recipient.status = RecipientStatus.SUCCESS;
        recipient.nombaTxId = transferData?.transactionId || '';
        recipient.failureReason = undefined as any;
        recipient.retryCount += 1;
        recipient.lastRetriedAt = new Date();
        successCount++;
      } catch (error: any) {
        const errorMsg = error.response?.data?.message || error.message;
        recipient.failureReason = errorMsg;
        recipient.retryCount += 1;
        recipient.lastRetriedAt = new Date();
        failureCount++;
      }
      await recipientRepository.save(recipient);
    }

    disbursement.totalSuccess = successCount;
    disbursement.totalFailed = failureCount;
    disbursement.totalPending = 0;

    if (successCount === disbursement.totalRecipients) {
      disbursement.status = DisbursementStatus.COMPLETED;
      disbursement.completedAt = new Date();
    } else if (successCount > 0) {
      disbursement.status = DisbursementStatus.PARTIALLY_FAILED;
    } else {
      disbursement.status = DisbursementStatus.FAILED;
    }

    return await disbursementRepository.save(disbursement);
  }
}
