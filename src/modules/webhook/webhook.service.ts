import { logger } from '../../config';
import { WebhookPayload, NOMBA_EVENTS } from './webhook.types';

// Routes the verified webhook payload to the correct event handler
export const handleWebhookEvent = (payload: WebhookPayload) => {
  const { event_type, requestId, data } = payload;
  const { transaction, merchant, customer } = data;

  logger.info(`[Webhook] ${event_type} — requestId: ${requestId}`);

  switch (event_type) {
    case NOMBA_EVENTS.PAYMENT_SUCCESS:
      logger.info(`Payment received: ₦${transaction.transactionAmount} from ${customer?.senderName} (${customer?.bankName})`);
      // TODO: mark order paid, notify user, update DB
      break;

    case NOMBA_EVENTS.PAYOUT_SUCCESS:
      logger.info(`Payout sent: ₦${transaction.transactionAmount} to ${customer?.recipientName}`);
      // TODO: update payout record
      break;

    case NOMBA_EVENTS.PAYMENT_FAILED:
      logger.warn(`Payment failed: ${transaction.responseCodeMessage} — txId: ${transaction.transactionId}`);
      // TODO: alert customer, update order status
      break;

    case NOMBA_EVENTS.PAYMENT_REVERSAL:
      logger.warn(`Payment reversed: ₦${transaction.transactionAmount} — txId: ${transaction.transactionId}`);
      // TODO: reverse order fulfilment
      break;

    case NOMBA_EVENTS.PAYOUT_FAILED:
      logger.warn(`Payout failed — txId: ${transaction.transactionId}`);
      // TODO: retry or notify admin
      break;

    case NOMBA_EVENTS.PAYOUT_REFUND:
      logger.info(`Payout refunded to wallet. New balance: ₦${merchant.walletBalance}`);
      // TODO: update wallet balance in DB
      break;

    default:
      logger.warn(`Unknown event type received: ${event_type}`);
  }
};
