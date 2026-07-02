import { AppDataSource } from '../../config';
import { logger } from '../../config';
import { WebhookPayload, NOMBA_EVENTS } from './webhook.types';
import { PaymentExpectation, ExpectationStatus } from '../../entities/payment-expectation.entity';
import { PaymentInstallment } from '../../entities/payment-installment.entity';
import { MisplacedPayment, MisplacedPaymentStatus } from '../../entities/misplaced-payment.entity';
import { DisbursementItem, ItemStatus } from '../../entities/disbursement-item.entity';
import { DisbursementBatch, BatchStatus } from '../../entities/disbursement-batch.entity';

const expectationRepository = AppDataSource.getRepository(PaymentExpectation);
const installmentRepository = AppDataSource.getRepository(PaymentInstallment);
const misplacedRepository = AppDataSource.getRepository(MisplacedPayment);
const itemRepository = AppDataSource.getRepository(DisbursementItem);
const batchRepository = AppDataSource.getRepository(DisbursementBatch);

// Routes the verified webhook payload to the correct event handler
export const handleWebhookEvent = async (payload: WebhookPayload): Promise<void> => {
  const { event_type, requestId, data } = payload;
  const { transaction, customer } = data;

  logger.info(`[Webhook] Processing event: ${event_type} — requestId: ${requestId}`);

  try {
    switch (event_type) {
      case NOMBA_EVENTS.PAYMENT_SUCCESS: {
        const amount = transaction.transactionAmount || 0;
        const ref = transaction.merchantTxRef;

        logger.info(`[Webhook] Payment success received: ₦${amount / 100} — TxRef: ${ref}`);

        let matched = false;

        // 1. Try to match by merchantTxRef to an expected payment
        if (ref) {
          const expectation = await expectationRepository.findOne({
            where: { reference: ref },
            relations: {installments : true},
          });

          if (expectation) {
            // Check for duplicate webhook execution
            const alreadyLogged = expectation.installments.some(
              (inst) => inst.nombaTransactionId === transaction.transactionId
            );

            if (!alreadyLogged) {
              await AppDataSource.transaction(async (manager) => {
                const installment = manager.create(PaymentInstallment, {
                  expectationId: expectation.id,
                  amount: amount,
                  nombaTransactionId: transaction.transactionId,
                  paidAt: new Date(transaction.time),
                });
                await manager.save(installment);

                expectation.amountReceived += amount;

                if (expectation.amountReceived >= expectation.expectedAmount) {
                  expectation.status = expectation.amountReceived === expectation.expectedAmount
                    ? ExpectationStatus.COMPLETE
                    : ExpectationStatus.OVERPAID;
                } else {
                  expectation.status = ExpectationStatus.PARTIAL;
                }
                await manager.save(expectation);
              });

              logger.info(`[Webhook] Matched payment to expectation "${ref}". Status is now: ${expectation.status}`);
            } else {
              logger.info(`[Webhook] Installment ${transaction.transactionId} already logged for expectation "${ref}"`);
            }
            matched = true;
          }
        }

        // 2. If not matched, it is a Misplaced Payment
        if (!matched) {
          logger.warn(`[Webhook] Unmatched payment received! Saving to Misplaced Payments.`);
          
          const existingMisplaced = await misplacedRepository.findOneBy({ nombaTransactionId: transaction.transactionId });
          if (!existingMisplaced) {
            const misplaced = misplacedRepository.create({
              nombaTransactionId: transaction.transactionId,
              amount: amount,
              senderName: customer?.senderName || 'Unknown',
              senderBank: customer?.bankCode || customer?.bankName || 'Unknown',
              accountNumber: customer?.accountNumber || 'Unknown',
              status: MisplacedPaymentStatus.UNMATCHED,
            });
            await misplacedRepository.save(misplaced);
            logger.info(`[Webhook] Misplaced payment recorded. ID: ${misplaced.id}`);
          }
        }
        break;
      }

      case NOMBA_EVENTS.PAYOUT_SUCCESS:
      case NOMBA_EVENTS.PAYOUT_FAILED: {
        const ref = transaction.merchantTxRef;
        if (ref && (ref.startsWith('DISB-') || ref.startsWith('DISB-RETRY-'))) {
          const parts = ref.split('-');
          // Format is DISB-{itemId}-{timestamp} or DISB-RETRY-{itemId}-{timestamp}
          const itemId = ref.startsWith('DISB-RETRY-') ? parts[2] : parts[1];

          logger.info(`[Webhook] Payout notification for item ID: ${itemId} — Result: ${event_type}`);

          const item = await itemRepository.findOneBy({ id: itemId });
          if (item) {
            item.status = event_type === NOMBA_EVENTS.PAYOUT_SUCCESS ? ItemStatus.SUCCESS : ItemStatus.FAILED;
            item.nombaTransactionId = transaction.transactionId;
            if (event_type === NOMBA_EVENTS.PAYOUT_FAILED) {
              item.failureReason = transaction.responseCodeMessage || 'Transfer rejected by processor';
            }
            await itemRepository.save(item);

            // Re-evaluate the batch status
            const batch = await batchRepository.findOne({
              where: { id: item.batchId },
              relations: { items: true },
            });

            if (batch) {
              const successCount = batch.items.filter((i) => i.status === ItemStatus.SUCCESS).length;
              const failureCount = batch.items.filter((i) => i.status === ItemStatus.FAILED).length;

              if (successCount === batch.recipientCount) {
                batch.status = BatchStatus.COMPLETED;
              } else if (failureCount === batch.recipientCount) {
                batch.status = BatchStatus.FAILED;
              } else {
                batch.status = BatchStatus.PARTIAL_FAILURE;
              }
              await batchRepository.save(batch);
              logger.info(`[Webhook] Batch "${batch.label}" status updated to: ${batch.status}`);
            }
          }
        }
        break;
      }

      case NOMBA_EVENTS.PAYMENT_REVERSAL: {
        logger.warn(`[Webhook] Reversal notification received for transaction: ${transaction.transactionId}`);
        // Handle logic if expectation installment needs to be marked reversed
        const installment = await installmentRepository.findOne({
          where: { nombaTransactionId: transaction.transactionId },
          relations: { expectation: true },
        });

        if (installment) {
          await AppDataSource.transaction(async (manager) => {
            const expectation = installment.expectation;
            expectation.amountReceived -= installment.amount;
            
            if (expectation.amountReceived <= 0) {
              expectation.status = ExpectationStatus.PENDING;
            } else {
              expectation.status = ExpectationStatus.PARTIAL;
            }
            
            await manager.save(expectation);
            await manager.remove(installment);
          });
          logger.info(`[Webhook] Reversal completed. Adjusted expectation: ${installment.expectationId}`);
        }
        break;
      }

      default:
        logger.info(`[Webhook] Event type ${event_type} logged but has no automated handler.`);
    }
  } catch (error) {
    logger.error(`[Webhook] Error processing webhook event ${event_type}:`, error);
  }
};
