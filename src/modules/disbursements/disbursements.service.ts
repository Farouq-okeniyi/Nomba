import { AppDataSource } from '../../config';
import { Disbursement, DisbursementStatus } from '../../entities/Disbursement';
import { DisbursementRecipient, RecipientStatus } from '../../entities/DisbursementRecipient';
import { Account, AccountStatus } from '../../entities/Account';
import * as nombaApi from '../../nomba/nomba.api';
import { ApiError } from '../../middlewares';
import { logger } from '../../config';
import { CreateDisbursementInput } from './disbursements.validation';
import { v4 as uuidv4 } from 'uuid';

const disbursementRepository = AppDataSource.getRepository(Disbursement);
const recipientRepository = AppDataSource.getRepository(DisbursementRecipient);
const accountRepository = AppDataSource.getRepository(Account);

async function processDisbursementTransfers(disbursementId: string) {
  const recipients = await recipientRepository.find({
    where: { disbursementId, status: RecipientStatus.PENDING },
    relations: { account: true },
  });

  for (const recipient of recipients) {
    try {
      const response = await nombaApi.initiateTransfer({
        amount: recipient.amount,
        accountNumber: recipient.accountNumber,
        bankCode: recipient.bankCode,
        accountName: recipient.accountName,
        narration: recipient.narration || 'Disbursement',
        merchantTxRef: recipient.merchantTxRef,
      }, recipient.idempotencyKey);

      const transferData = response.data?.data;
      recipient.nombaTxId = transferData?.transactionId || transferData?.id || '';
      recipient.nombaStatus = 'SUCCESS';
      recipient.nombaRawResponse = transferData;
      // Status updated via webhook (transfer.success / transfer.failed)
      // Do not update status here — wait for Nomba webhook confirmation
      await recipientRepository.save(recipient);

    } catch (err: any) {
      recipient.status = RecipientStatus.FAILED;
      recipient.failureReason = err.response?.data?.message || err.message;
      recipient.nombaRawResponse = err.response?.data || null;
      await recipientRepository.save(recipient);

      // Update disbursement counters
      await disbursementRepository.increment({ id: disbursementId }, 'totalFailed', 1);
      await disbursementRepository.decrement({ id: disbursementId }, 'totalPending', 1);
    }
  }
}

export class DisbursementsService {
  static async createAndExecuteBatch(input: CreateDisbursementInput & { merchantId: string }): Promise<Disbursement> {
    const { merchantId } = input;

    // Step 1: Only validate accountIds that were provided
    const providedAccountIds = input.items
      .filter(r => r.accountId)
      .map(r => r.accountId as string);

    if (providedAccountIds.length > 0) {
      const accounts = await accountRepository.find({
        where: providedAccountIds.map(id => ({ id, merchantId, status: AccountStatus.ACTIVE }))
      });

      if (accounts.length !== providedAccountIds.length) {
        const foundIds = accounts.map(a => a.id);
        const missingIds = providedAccountIds.filter(id => !foundIds.includes(id));
        throw new ApiError(400, `The following accountIds are invalid, inactive, or do not belong to this merchant: [${missingIds.join(', ')}]`, true);
      }
    }

    // Check for duplicate reference
    const existing = await disbursementRepository.findOne({ where: { merchantId, reference: input.reference } });
    if (existing) {
      throw new ApiError(400, `A disbursement with reference ${input.reference} already exists for this merchant.`, true);
    }

    // Step 2: Calculate total amount
    const totalAmount = input.items.reduce((sum, r) => sum + r.amount, 0);

    // Step 3: Create Disbursement record
    const disbursement = disbursementRepository.create({
      merchantId,
      reference: input.reference,
      narration: input.narration,
      totalAmount,
      totalRecipients: input.items.length,
      totalPending: input.items.length,
      totalSuccess: 0,
      totalFailed: 0,
      status: DisbursementStatus.PENDING,
    });
    await disbursementRepository.save(disbursement);

    // Step 4: For each recipient — generate merchantTxRef, run Nomba lookup, save record
    for (const recipientDto of input.items) {
      // Generate and save merchantTxRef BEFORE calling Nomba
      const merchantTxRef = `DISB-${uuidv4().replace(/-/g, '').slice(0, 16)}`;
      const idempotencyKey = uuidv4();

      // Call Nomba lookup to verify and resolve account name
      let resolvedAccountName: string;
      try {
        const lookup = await nombaApi.lookupBankAccount({
          accountNumber: recipientDto.accountNumber,
          bankCode: recipientDto.bankCode,
        });
        resolvedAccountName = lookup?.accountName || 'Unknown Name';
      } catch (err: any) {
        // If lookup fails, create recipient as FAILED immediately
        await recipientRepository.save(recipientRepository.create({
          merchantId,
          disbursementId: disbursement.id,
          accountId: recipientDto.accountId || null,
          accountNumber: recipientDto.accountNumber,
          bankCode: recipientDto.bankCode,
          accountName: 'LOOKUP_FAILED',
          amount: recipientDto.amount,
          narration: recipientDto.narration,
          merchantTxRef,
          idempotencyKey,
          status: RecipientStatus.FAILED,
          failureReason: 'Account name lookup failed — transfer not attempted',
        }));

        await disbursementRepository.increment({ id: disbursement.id }, 'totalFailed', 1);
        await disbursementRepository.decrement({ id: disbursement.id }, 'totalPending', 1);
        continue;
      }

      // Save recipient record with PENDING status
      await recipientRepository.save(recipientRepository.create({
        merchantId,
        disbursementId: disbursement.id,
        accountId: recipientDto.accountId || null,
        accountNumber: recipientDto.accountNumber,
        bankCode: recipientDto.bankCode,
        accountName: resolvedAccountName,
        amount: recipientDto.amount,
        narration: recipientDto.narration,
        merchantTxRef,
        idempotencyKey,
        status: RecipientStatus.PENDING,
      }));
    }

    // Step 5: Update disbursement status to PROCESSING
    disbursement.status = DisbursementStatus.PROCESSING;
    await disbursementRepository.save(disbursement);

    // Step 6: Process transfers asynchronously — do not block the response
    processDisbursementTransfers(disbursement.id).catch(err => {
      logger.error(`[Disbursement] Background processing failed: ${err.message}`);
    });

    return disbursement;
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

    for (const recipient of failedRecipients) {
      try {
        // ALWAYS use the original merchantTxRef for retries
        recipient.idempotencyKey = uuidv4();
        const transferResponse = await nombaApi.initiateTransfer({
          amount: recipient.amount,
          bankCode: recipient.bankCode,
          accountNumber: recipient.accountNumber,
          accountName: recipient.accountName,
          narration: `Retry payout`,
          merchantTxRef: recipient.merchantTxRef,
        }, recipient.idempotencyKey);

        const transferData = transferResponse.data?.data;
        recipient.status = RecipientStatus.PENDING; // Webhook will complete it
        recipient.nombaTxId = transferData?.transactionId || transferData?.id || '';
        recipient.failureReason = undefined as any;
        recipient.retryCount += 1;
        recipient.lastRetriedAt = new Date();
      } catch (error: any) {
        const errorMsg = error.response?.data?.message || error.message;
        recipient.failureReason = errorMsg;
        recipient.retryCount += 1;
        recipient.lastRetriedAt = new Date();
      }
      await recipientRepository.save(recipient);
    }

    return await disbursementRepository.save(disbursement);
  }
}
