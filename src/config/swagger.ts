import { Options } from 'swagger-jsdoc';
import { allPaths } from './swagger/index';

// ─── Shared component schemas ─────────────────────────────────────────────────
const components = {
  securitySchemes: {
    bearerAuth: {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'API_KEY',
      description: 'Enter your API key (format: nva_live_xxxx)',
    },
  },
  schemas: {
    Transaction: {
      type: 'object',
      required: ['transactionId', 'type', 'time'],
      properties: {
        transactionId:         { type: 'string',  example: 'TXN-20260629-abc123' },
        type:                  { type: 'string',  example: 'vact_transfer' },
        time:                  { type: 'string',  example: '2026-06-29T17:00:00Z' },
        responseCode:          { type: 'string',  example: '' },
        fee:                   { type: 'number',  example: 50 },
        sessionId:             { type: 'string',  example: 'SESSION-xyz789' },
        aliasAccountNumber:    { type: 'string',  example: '0123456789' },
        aliasAccountName:      { type: 'string',  example: 'Hotel Grand Palace' },
        aliasAccountReference: { type: 'string',  example: 'REF-001' },
        aliasAccountType:      { type: 'string',  example: 'VIRTUAL' },
        transactionAmount:     { type: 'number',  example: 150000 },
        narration:             { type: 'string',  example: 'Room booking' },
        originatingFrom:       { type: 'string',  example: 'api' },
        merchantTxRef:         { type: 'string',  example: 'HOTEL-ORDER-001' },
        responseCodeMessage:   { type: 'string',  example: 'Approved' },
        rrn:                   { type: 'string',  example: '262915000001' },
        cardIssuer:            { type: 'string',  example: 'VISA' },
        cardBank:              { type: 'string',  example: 'GTBank' },
        cardPan:               { type: 'string',  example: '411111******1111' },
      },
    },

    Merchant: {
      type: 'object',
      required: ['userId'],
      properties: {
        walletId:      { type: 'string', example: 'WALLET-nomba-001' },
        walletBalance: { type: 'number', example: 5000000 },
        userId:        { type: 'string', example: 'USR-nomba-001' },
      },
    },

    Customer: {
      type: 'object',
      properties: {
        bankCode:      { type: 'string', example: '058' },
        senderName:    { type: 'string', example: 'John Doe' },
        recipientName: { type: 'string', example: 'Jane Smith' },
        bankName:      { type: 'string', example: 'GTBank' },
        accountNumber: { type: 'string', example: '0987654321' },
        productId:     { type: 'string', example: 'PROD-001' },
        cardPan:       { type: 'string', example: '411111******1111' },
      },
    },

    WebhookPayload: {
      type: 'object',
      required: ['event_type', 'requestId', 'data'],
      properties: {
        event_type: {
          type: 'string',
          enum: [
            'virtual_account.funded',
            'transfer.success',
            'transfer.failed',
            'payment_reversal',
          ],
          example: 'virtual_account.funded',
        },
        requestId: { type: 'string', example: 'REQ-20260629-001' },
        data: {
          type: 'object',
          required: ['merchant', 'transaction'],
          properties: {
            merchant:    { $ref: '#/components/schemas/Merchant' },
            transaction: { $ref: '#/components/schemas/Transaction' },
            customer:    { $ref: '#/components/schemas/Customer' },
            terminal:    { type: 'object', additionalProperties: true, example: {} },
          },
        },
      },
    },

    WebhookAckResponse: {
      type: 'object',
      properties: {
        received: { type: 'boolean', example: true },
      },
    },

    ErrorResponse: {
      type: 'object',
      properties: {
        status:        { type: 'integer', example: 401 },
        message:       { type: 'string',  example: 'Invalid webhook signature' },
        isOperational: { type: 'boolean', example: false },
        details:       { type: 'object',  nullable: true, example: null },
      },
    },

    ValidationErrorResponse: {
      type: 'object',
      properties: {
        status:        { type: 'integer', example: 400 },
        message:       { type: 'string',  example: 'Invalid payload' },
        isOperational: { type: 'boolean', example: true },
        fieldErrors: {
          type: 'object',
          additionalProperties: { type: 'array', items: { type: 'string' } },
          example: { 'data.transaction.transactionId': ['Required'] },
        },
        formErrors: { type: 'array', items: { type: 'string' }, example: [] },
      },
    },
  },
};

// ─── Tags ─────────────────────────────────────────────────────────────────────
const tags = [
  { name: 'Webhooks',              description: 'Receive Nomba payment events' },
  { name: 'Merchants',             description: 'Merchant registration and API key management' },
  { name: 'Accounts',              description: 'Virtual account provisioning and management' },
  { name: 'Transactions',          description: 'Inbound transaction history and statements' },
  { name: 'Disbursements',         description: 'Bulk payout batch management' },
  { name: 'Misplaced Payments',    description: 'Handle payments received on wrong or inactive accounts' },
  { name: 'Payment Expectations',  description: 'Track installment/partial payment collection' },
];

// ─── Spec builder ─────────────────────────────────────────────────────────────
// Builds the spec with the live server URL injected at request time.
// This way the spec always points to whatever host is serving it.
export const createSwaggerSpec = (serverUrl: string): object => ({
  openapi: '3.0.3',
  info: {
    title: 'Nomba Webhook Service',
    version: '1.0.0',
    description: 'API for receiving Nomba payment events, managing virtual accounts, and executing bulk disbursements.',
  },
  servers: [{ url: serverUrl }],
  tags,
  components,
  paths: allPaths,
});
