/**
 * Swagger definitions for the Payment Expectations API
 */
export const paymentExpectationsDocs = {
  paths: {
    '/payment-expectations': {
      post: {
        tags: ['Payment Expectations'],
        operationId: 'createPaymentExpectation',
        summary: 'Declare a new payment expectation',
        description: 'Declares an expected amount for an account. Nomba enforces exact-amount matching at the bank rail level; this record tracks progress toward that amount across multiple installments.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reference', 'accountId', 'expectedAmount'],
                properties: {
                  reference:      { type: 'string',  example: 'ORDER-2026-991A' },
                  accountId:      { type: 'string',  example: '550e8400-e29b-41d4-a716-446655440000' },
                  expectedAmount: { type: 'integer', description: 'Amount expected in kobo (e.g. 150000 = ₦1,500)', example: 150000 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Expectation registered successfully' },
          '400': { description: 'Validation failed or duplicate reference' },
        },
      },
      get: {
        tags: ['Payment Expectations'],
        operationId: 'listPaymentExpectations',
        summary: 'List all payment expectations',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            in: 'query',
            name: 'status',
            schema: { type: 'string', enum: ['PENDING', 'PARTIAL', 'SETTLED', 'CANCELLED'] },
            description: 'Filter expectations by status',
          },
        ],
        responses: {
          '200': { description: 'List of payment expectations' },
        },
      },
    },

    '/payment-expectations/{id}': {
      get: {
        tags: ['Payment Expectations'],
        operationId: 'getPaymentExpectation',
        summary: 'Get payment expectation details',
        description: 'Returns current amountPaid, outstanding balance, and status (PENDING, PARTIAL, SETTLED) for a given expectation.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Payment expectation details' },
          '404': { description: 'Expectation not found' },
        },
      },
      patch: {
        tags: ['Payment Expectations'],
        operationId: 'updatePaymentExpectation',
        summary: 'Update expected amount for a payment expectation',
        description: 'Updates the expected amount. For auto-created expectations tied to a virtual account, this follows a Nomba-first strategy — the virtual account\'s amount is updated on Nomba before the local record, preventing drift.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['expectedAmount'],
                properties: {
                  expectedAmount: { type: 'integer', description: 'New expected amount in kobo (minimum 10000)', example: 25000 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Expectation updated successfully' },
          '400': { description: 'Cannot update a settled expectation' },
          '404': { description: 'Expectation not found' },
        },
      },
    },

    '/payment-expectations/{id}/installments': {
      get: {
        tags: ['Payment Expectations'],
        operationId: 'listInstallments',
        summary: 'Get all installments for an expectation',
        description: 'Returns the immutable log of every partial payment applied toward this expectation, in order.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'List of installments with running totals' },
          '404': { description: 'Expectation not found' },
        },
      },
    },
  },
};
