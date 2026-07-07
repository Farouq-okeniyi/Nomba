/**
 * Swagger definitions for the Payment Expectations API
 */
export const paymentExpectationsDocs = {
  paths: {
    '/payment-expectations': {
      post: {
        tags: ['Payment Expectations'],
        summary: 'Declare a new payment expectation',
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
        summary: 'Get payment expectation details',
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
        summary: 'Update expected amount for a payment expectation',
        description: 'Updates the expectedAmount. For AUTO-created expectations, calls Nomba first to update the virtual account amount. If Nomba fails, no DB changes are made.',
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
        summary: 'Get all installments for an expectation',
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
