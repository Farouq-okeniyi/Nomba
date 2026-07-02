import { AppDataSource } from '../../config';
import { DisbursementBatch, BatchStatus } from '../../entities/disbursement-batch.entity';
import { DisbursementItem, ItemStatus } from '../../entities/disbursement-item.entity';
import * as nombaApi from '../../nomba/nomba.api';
import { ApiError } from '../../middlewares';
import { logger } from '../../config';
import { CreateDisbursementInput } from './disbursements.types';

const batchRepository = AppDataSource.getRepository(DisbursementBatch);
const itemRepository = AppDataSource.getRepository(DisbursementItem);

export class DisbursementsService {
  static async createAndExecuteBatch(input: CreateDisbursementInput): Promise<DisbursementBatch> {
    const totalAmount = input.items.reduce((sum, item) => sum + item.amount, 0);

    // 1. Validate balance from Nomba API
    try {
      const balanceResponse = await nombaApi.getWalletBalance();
      // Nomba balance is in kobo, stored under data.walletBalance or data.amount
      const data = balanceResponse.data?.data;
      const walletBalance = data?.walletBalance ?? data?.amount ?? 0;

      if (walletBalance < totalAmount) {
        throw new ApiError(
          400,
          `Insufficient Nomba wallet balance. Required: ₦${totalAmount / 100}, Available: ₦${walletBalance / 100}`,
          true
        );
      }
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      logger.warn(`[Disbursements] Could not check Nomba wallet balance: ${error.message}. Proceeding anyway.`);
    }

    // 2. Create the Batch in PROCESSING state
    const batch = batchRepository.create({
      label: input.label,
      totalAmount,
      recipientCount: input.items.length,
      status: BatchStatus.PROCESSING,
    });
    const savedBatch = await batchRepository.save(batch);

    // 3. Create items linked to the batch
    const items = input.items.map((item) =>
      itemRepository.create({
        batchId: savedBatch.id,
        recipientName: item.recipientName,
        accountNumber: item.accountNumber,
        bankCode: item.bankCode,
        amount: item.amount,
        status: ItemStatus.PENDING,
      })
    );
    const savedItems = await itemRepository.save(items);

    // 4. Execute payouts sequentially to avoid concurrent rate-limiting or duplicate issues
    let successCount = 0;
    let failureCount = 0;

    for (const item of savedItems) {
      try {
        logger.info(`[Disbursements] Processing payout of ₦${item.amount / 100} to ${item.recipientName} (${item.accountNumber})`);
        
        const transferResponse = await nombaApi.initiateTransfer({
          amount: item.amount,
          bankCode: item.bankCode,
          accountNumber: item.accountNumber,
          narration: `Payout: ${input.label}`,
          merchantTxRef: `DISB-${item.id}-${Date.now()}`,
        });

        const transferData = transferResponse.data?.data;
        item.status = ItemStatus.SUCCESS;
        item.nombaTransactionId = transferData?.transactionId || transferData?.id || 'TXN-SUCCESS';
        successCount++;
      } catch (error: any) {
        const errorMsg = error.response?.data?.message || error.message;
        logger.error(`[Disbursements] Payout failed for item ${item.id}: ${errorMsg}`);
        item.status = ItemStatus.FAILED;
        item.failureReason = errorMsg;
        failureCount++;
      }
      await itemRepository.save(item);
    }

    // 5. Update Batch Status
    savedBatch.executedAt = new Date();
    if (successCount === savedBatch.recipientCount) {
      savedBatch.status = BatchStatus.COMPLETED;
    } else if (failureCount === savedBatch.recipientCount) {
      savedBatch.status = BatchStatus.FAILED;
    } else {
      savedBatch.status = BatchStatus.PARTIAL_FAILURE;
    }

    return await batchRepository.save(savedBatch);
  }

  static async listBatches(): Promise<DisbursementBatch[]> {
    return await batchRepository.find({ order: { createdAt: 'DESC' } });
  }

  static async getBatchById(id: string): Promise<DisbursementBatch> {
    const batch = await batchRepository.findOne({
      where: { id },
      relations: { items: true },
    });

    if (!batch) {
      throw new ApiError(404, 'Disbursement batch not found', true);
    }

    return batch;
  }

  static async retryFailedItems(id: string): Promise<DisbursementBatch> {
    const batch = await this.getBatchById(id);
    if (batch.status === BatchStatus.COMPLETED) {
      throw new ApiError(400, 'Batch is already fully completed', true);
    }

    const failedItems = batch.items.filter((item) => item.status === ItemStatus.FAILED);
    if (failedItems.length === 0) {
      throw new ApiError(400, 'No failed items to retry in this batch', true);
    }

    logger.info(`[Disbursements] Retrying ${failedItems.length} failed items in batch: ${batch.label}`);

    let successCount = batch.items.filter((item) => item.status === ItemStatus.SUCCESS).length;
    let failureCount = 0;

    for (const item of failedItems) {
      try {
        const transferResponse = await nombaApi.initiateTransfer({
          amount: item.amount,
          bankCode: item.bankCode,
          accountNumber: item.accountNumber,
          narration: `Payout Retry: ${batch.label}`,
          merchantTxRef: `DISB-RETRY-${item.id}-${Date.now()}`,
        });

        const transferData = transferResponse.data?.data;
        item.status = ItemStatus.SUCCESS;
        item.nombaTransactionId = transferData?.transactionId || transferData?.id || 'TXN-SUCCESS';
        item.failureReason = "-";
        successCount++;
      } catch (error: any) {
        const errorMsg = error.response?.data?.message || error.message;
        item.failureReason = errorMsg;
        failureCount++;
      }
      await itemRepository.save(item);
    }

    if (successCount === batch.recipientCount) {
      batch.status = BatchStatus.COMPLETED;
    } else if (successCount > 0) {
      batch.status = BatchStatus.PARTIAL_FAILURE;
    } else {
      batch.status = BatchStatus.FAILED;
    }

    return await batchRepository.save(batch);
  }
}
