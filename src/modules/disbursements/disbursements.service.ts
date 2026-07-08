import { AppDataSource } from '../../config';
import { Disbursement, DisbursementStatus } from '../../entities/Disbursement';
import { DisbursementRecipient, RecipientStatus } from '../../entities/DisbursementRecipient';
import { Transaction, TransactionType, TransactionStatus } from '../../entities/Transaction';
import * as nombaApi from '../../nomba/nomba.api';
import { ApiError } from '../../middlewares';
import { logger } from '../../config';
import { CreateDisbursementInput } from './disbursements.validation';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { writeAuditLog } from '../../extension/audit';

const disbursementRepository = AppDataSource.getRepository(Disbursement);
const recipientRepository = AppDataSource.getRepository(DisbursementRecipient);
const transactionRepository = AppDataSource.getRepository(Transaction);

export class DisbursementsService {
  static async createAndExecuteBatch(input: CreateDisbursementInput & { merchantId: string }): Promise<Disbursement> {
    const { merchantId } = input;

    // Check for duplicate reference
    const existing = await disbursementRepository.findOne({ where: { merchantId, reference: input.reference } });
    if (existing) {
      throw new ApiError(400, `A disbursement with reference ${input.reference} already exists for this merchant.`, true);
    }

    // Step 2: Calculate total amount
    const totalAmount = input.items.reduce((sum, r) => sum + r.amount, 0);

    // Step 3: Create Disbursement record
    const disbursement = await disbursementRepository.save(disbursementRepository.create({
      merchantId,
      reference: input.reference,
      narration: input.narration,
      totalAmount,
      totalRecipients: input.items.length,
      totalPending: input.items.length,
      totalSuccess: 0,
      totalFailed: 0,
      status: DisbursementStatus.PROCESSING,
    }));

    await writeAuditLog({
      merchantId: disbursement.merchantId,
      entityType: 'Disbursement',
      entityId: disbursement.id,
      action: 'DISBURSEMENT_CREATED',
      previousState: undefined,
      newState: {
        reference: disbursement.reference,
        totalAmount: disbursement.totalAmount,
        totalRecipients: disbursement.totalRecipients,
        status: disbursement.status,
      },
      triggeredBy: `API:${disbursement.merchantId}`,
    });

    // Step 4: For each recipient — generate merchantTxRef, run Nomba lookup, create transaction, call transfer
    for (const recipientDto of input.items) {
      // Step 1: Generate merchantTxRef BEFORE anything else
      const merchantTxRef = `DISB-${crypto.randomUUID()}`;
      const idempotencyKey = crypto.randomUUID();

      // Step 2: Run Nomba lookup to verify and resolve account name
      let resolvedAccountName: string;
      try {
        const lookup = await nombaApi.lookupBankAccount({
          accountNumber: recipientDto.accountNumber,
          bankCode: recipientDto.bankCode,
        });
        resolvedAccountName = lookup?.accountName || 'Unknown Name';
      } catch (err: any) {
        // Lookup failed — save recipient as FAILED, skip transfer
        await recipientRepository.save(recipientRepository.create({
          merchantId,
          disbursementId: disbursement.id,
          accountNumber: recipientDto.accountNumber,
          bankCode: recipientDto.bankCode,
          accountName: 'LOOKUP_FAILED',
          amount: recipientDto.amount,
          narration: recipientDto.narration,
          merchantTxRef,
          idempotencyKey,
          transactionId: null,
          status: RecipientStatus.FAILED,
          failureReason: 'Account name lookup failed — transfer not attempted',
        }));
        await disbursementRepository.increment({ id: disbursement.id }, 'totalFailed', 1);
        await disbursementRepository.decrement({ id: disbursement.id }, 'totalPending', 1);
        continue;
      }

      // Step 3: Save recipient record with PENDING status
      const recipient = await recipientRepository.save(recipientRepository.create({
        merchantId,
        disbursementId: disbursement.id,
        accountNumber: recipientDto.accountNumber,
        bankCode: recipientDto.bankCode,
        accountName: resolvedAccountName,
        amount: recipientDto.amount,
        narration: recipientDto.narration,
        merchantTxRef,
        idempotencyKey,
        transactionId: null,
        status: RecipientStatus.PENDING,
      }));

      // Step 4: Create PENDING OUTBOUND transaction BEFORE calling Nomba
      // accountId is null — this is a merchant-level outbound transaction
      const transaction = await transactionRepository.save(transactionRepository.create({
        merchantId,
        accountId: null,
        merchantTxRef,
        type: TransactionType.OUTBOUND,
        amount: recipientDto.amount,
        currency: 'NGN',
        status: TransactionStatus.PENDING,
        narration: recipientDto.narration || `Disbursement: ${disbursement.reference}`,
        rawWebhookPayload: null,
      }));

      // Step 5: Link transaction to recipient
      recipient.transactionId = transaction.id;
      await recipientRepository.save(recipient);

      // Step 6: Call Nomba transfer
      try {
        const nombaResponse = await nombaApi.initiateTransfer({
          amount: recipientDto.amount,
          accountNumber: recipientDto.accountNumber,
          bankCode: recipientDto.bankCode,
          accountName: resolvedAccountName,
          narration: recipientDto.narration || `Disbursement: ${disbursement.reference}`,
          merchantTxRef, // saved ref — never generate new one
        }, idempotencyKey);

        const transferData = nombaResponse.data?.data || nombaResponse;
        recipient.nombaTxId = transferData?.transactionId || transferData?.id || '';
        recipient.nombaStatus = transferData?.status || 'SUCCESS';
        recipient.nombaRawResponse = transferData;
        await recipientRepository.save(recipient);

      } catch (err: any) {
        // Transfer failed — mark both recipient and transaction as FAILED
        recipient.status = RecipientStatus.FAILED;
        recipient.failureReason = err.response?.data?.message || err.message;
        recipient.nombaRawResponse = err.response?.data || null;
        await recipientRepository.save(recipient);

        transaction.status = TransactionStatus.FAILED;
        await transactionRepository.save(transaction);

        await disbursementRepository.increment({ id: disbursement.id }, 'totalFailed', 1);
        await disbursementRepository.decrement({ id: disbursement.id }, 'totalPending', 1);
      }
    }

    // Refresh and check if done immediately
    const updatedDisbursement = await disbursementRepository.findOne({ where: { id: disbursement.id } });
    if (updatedDisbursement && updatedDisbursement.totalPending === 0) {
      if (updatedDisbursement.totalFailed === updatedDisbursement.totalRecipients) {
        updatedDisbursement.status = DisbursementStatus.FAILED;
      } else if (updatedDisbursement.totalSuccess === updatedDisbursement.totalRecipients) {
        updatedDisbursement.status = DisbursementStatus.COMPLETED;
      } else {
        updatedDisbursement.status = DisbursementStatus.PARTIALLY_FAILED;
      }
      updatedDisbursement.completedAt = new Date();
      await disbursementRepository.save(updatedDisbursement);

      await writeAuditLog({
        merchantId: updatedDisbursement.merchantId,
        entityType: 'Disbursement',
        entityId: updatedDisbursement.id,
        action: `DISBURSEMENT_${updatedDisbursement.status}`, // COMPLETED, PARTIALLY_FAILED, FAILED
        previousState: { status: 'PROCESSING' },
        newState: {
          status: updatedDisbursement.status,
          totalSuccess: updatedDisbursement.totalSuccess,
          totalFailed: updatedDisbursement.totalFailed,
          completedAt: updatedDisbursement.completedAt,
        },
        triggeredBy: 'SYSTEM',
      });

      return updatedDisbursement;
    }

    return updatedDisbursement!;
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

        const transferData = transferResponse.data?.data || transferResponse;
        recipient.status = RecipientStatus.PENDING; // Webhook will complete it
        recipient.nombaTxId = transferData?.transactionId || transferData?.id || '';
        recipient.failureReason = undefined as any;
        recipient.retryCount += 1;
        recipient.lastRetriedAt = new Date();
        
        // Also update the linked transaction status back to PENDING
        if (recipient.transactionId) {
          await transactionRepository.update({ id: recipient.transactionId }, { status: TransactionStatus.PENDING });
        }
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
