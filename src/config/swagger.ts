import swaggerJSDoc, { Options } from 'swagger-jsdoc';

const baseOptions: Omit<Options, 'definition'> & { definition: Omit<NonNullable<Options['definition']>, 'servers'> } = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Nomba Webhook Service',
      version: '1.0.0',
    },

    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API Key',
        },
        NombaSignature: {
          type: 'apiKey',
          in: 'header',
          name: 'nomba-signature',
        },
        NombaTimestamp: {
          type: 'apiKey',
          in: 'header',
          name: 'nomba-timestamp',
        },
      },
      schemas: {
        Transaction: {
          type: 'object',
          required: ['transactionId', 'type', 'time'],
          properties: {
            transactionId:        { type: 'string',  example: 'TXN-20260629-abc123' },
            type:                 { type: 'string',  example: 'PAYMENT' },
            time:                 { type: 'string',  example: '2026-06-29T17:00:00Z' },
            responseCode:         { type: 'string',  example: '00' },
            fee:                  { type: 'number',  example: 50 },
            sessionId:            { type: 'string',  example: 'SESSION-xyz789' },
            aliasAccountNumber:   { type: 'string',  example: '0123456789' },
            aliasAccountName:     { type: 'string',  example: 'Hotel Grand Palace' },
            aliasAccountReference:{ type: 'string',  example: 'REF-001' },
            aliasAccountType:     { type: 'string',  example: 'VIRTUAL' },
            transactionAmount:    { type: 'number',  example: 150000 },
            narration:            { type: 'string',  example: 'Room booking' },
            originatingFrom:      { type: 'string',  example: 'BANK_TRANSFER' },
            merchantTxRef:        { type: 'string',  example: 'HOTEL-ORDER-001' },
            responseCodeMessage:  { type: 'string',  example: 'Approved' },
            rrn:                  { type: 'string',  example: '262915000001' },
            cardIssuer:           { type: 'string',  example: 'VISA' },
            cardBank:             { type: 'string',  example: 'GTBank' },
            cardPan:              { type: 'string',  example: '411111******1111' },
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
                'payment_success',
                'payout_success',
                'payment_failed',
                'payment_reversal',
                'payout_failed',
                'payout_refund',
              ],
              example: 'payment_success',
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
            message:       { type: 'string',  example: 'Invalid webhook payload' },
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
    },
    tags: [
      { name: 'Webhooks' },
      { name: 'Merchants' },
      { name: 'Transactions' },
      { name: 'Accounts' },
      { name: 'Disbursements' },
      { name: 'Misplaced Payments' },
      { name: 'Payment Expectations' },
    ],
  },
  apis: ['./src/modules/**/*.ts', './src/modules/**/*.js'],
};

// Builds the spec with the live server URL injected at request time.
// This way the spec always points to whatever host is serving it.
export const createSwaggerSpec = (serverUrl: string) =>
  swaggerJSDoc({
    ...baseOptions,
    definition: {
      ...(baseOptions.definition as any),
      servers: [{ url: serverUrl }],
    },
  } as Options);
