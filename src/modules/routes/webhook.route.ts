import express from 'express';
import { webhookController } from '../webhook/webhook.controller';
import { verifyWebhookSignature } from '../../middlewares';

const webhookRoute = express.Router();

/**
 * @openapi
 * /webhooks/nomba:
 *   post:
 *     tags:
 *       - Webhooks
 *     summary: Receive Nomba payment event
 *     security:
 *       - NombaSignature: []
 *         NombaTimestamp: []
 *     parameters:
 *       - in: header
 *         name: nomba-signature
 *         required: true
 *         schema:
 *           type: string
 *         example: "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c="
 *       - in: header
 *         name: nomba-timestamp
 *         required: true
 *         schema:
 *           type: string
 *         example: "1751220000"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WebhookPayload'
 *           examples:
 *             virtual_account.funded:
 *               summary: Payment received
 *               value:
 *                 event_type: virtual_account.funded
 *                 requestId: REQ-20260629-001
 *                 data:
 *                   merchant:
 *                     walletId: WALLET-nomba-001
 *                     walletBalance: 5150000
 *                     userId: USR-nomba-001
 *                   transaction:
 *                     transactionId: TXN-20260629-abc123
 *                     type: PAYMENT
 *                     time: "2026-06-29T17:00:00Z"
 *                     responseCode: "00"
 *                     fee: 50
 *                     transactionAmount: 150000
 *                     narration: "Room booking"
 *                     merchantTxRef: HOTEL-ORDER-001
 *                     responseCodeMessage: Approved
 *                     rrn: "262915000001"
 *                   customer:
 *                     senderName: John Doe
 *                     bankName: GTBank
 *                     bankCode: "058"
 *                     accountNumber: "0987654321"
 *                   terminal: {}
 *             transfer.success:
 *               summary: Payout sent
 *               value:
 *                 event_type: transfer.success
 *                 requestId: REQ-20260629-002
 *                 data:
 *                   merchant:
 *                     walletId: WALLET-nomba-001
 *                     walletBalance: 4850000
 *                     userId: USR-nomba-001
 *                   transaction:
 *                     transactionId: TXN-20260629-def456
 *                     type: PAYOUT
 *                     time: "2026-06-29T17:05:00Z"
 *                     responseCode: "00"
 *                     transactionAmount: 300000
 *                     narration: "Refund — cancelled reservation"
 *                   customer:
 *                     recipientName: Jane Smith
 *                     bankName: Access Bank
 *                     bankCode: "044"
 *                     accountNumber: "1234567890"
 *                   terminal: {}
 *             transfer.failed:
 *               summary: Payout failed
 *               value:
 *                 event_type: transfer.failed
 *                 requestId: REQ-20260629-003
 *                 data:
 *                   merchant:
 *                     userId: USR-nomba-001
 *                   transaction:
 *                     transactionId: TXN-20260629-ghi789
 *                     type: PAYMENT
 *                     time: "2026-06-29T17:10:00Z"
 *                     responseCode: "05"
 *                     responseCodeMessage: "Do not honour"
 *                     transactionAmount: 50000
 *                   terminal: {}
 *             payment_reversal:
 *               summary: Payment reversed
 *               value:
 *                 event_type: payment_reversal
 *                 requestId: REQ-20260629-004
 *                 data:
 *                   merchant:
 *                     walletId: WALLET-nomba-001
 *                     walletBalance: 5000000
 *                     userId: USR-nomba-001
 *                   transaction:
 *                     transactionId: TXN-20260629-abc123
 *                     type: REVERSAL
 *                     time: "2026-06-29T18:00:00Z"
 *                     transactionAmount: 150000
 *                   terminal: {}
 *             transfer.refund:
 *               summary: Payout refunded
 *               value:
 *                 event_type: transfer.refund
 *                 requestId: REQ-20260629-005
 *                 data:
 *                   merchant:
 *                     walletId: WALLET-nomba-001
 *                     walletBalance: 5150000
 *                     userId: USR-nomba-001
 *                   transaction:
 *                     transactionId: TXN-20260629-def456
 *                     type: REFUND
 *                     time: "2026-06-29T18:10:00Z"
 *                     transactionAmount: 300000
 *                   terminal: {}
 *     responses:
 *       "200":
 *         description: Event acknowledged
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WebhookAckResponse'
 *       "400":
 *         description: Invalid payload
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationErrorResponse'
 *       "401":
 *         description: Missing or invalid signature headers
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       "500":
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
webhookRoute.post('/nomba', verifyWebhookSignature, webhookController.receiveWebhook);

export { webhookRoute };
