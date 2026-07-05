/**
 * Swagger definitions for the Disbursements API
 */
export const disbursementsDocs = {
  paths: {
    '/disbursements': {
      post: {
        tags: ['Disbursements'],
        summary: 'Create and execute a bulk disbursement batch',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['reference', 'items'],
                properties: {
                  reference: { type: 'string', example: 'BATCH-JUNE-2026' },
                  narration:  { type: 'string', example: 'Staff Salaries June 2026' },
                  items: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['accountNumber', 'bankCode', 'amount'],
                      properties: {
                        accountId:     { type: 'string', format: 'uuid', example: '123e4567-e89b-12d3-a456-426614174000' },
                        accountNumber: { type: 'string', example: '0123456789' },
                        bankCode:      { type: 'string', example: '058' },
                        amount:        { type: 'integer', description: 'Amount in kobo', example: 500000 },
                        narration:     { type: 'string', example: 'June Salary' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Batch created and transfers are processing in the background' },
          '400': { description: 'Validation failed or insufficient balance' },
        },
      },
      get: {
        tags: ['Disbursements'],
        summary: 'List all disbursement batches',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'List of disbursement batches' },
        },
      },
    },

    '/disbursements/{id}': {
      get: {
        tags: ['Disbursements'],
        summary: 'Get batch details with recipient items',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Batch details' },
          '404': { description: 'Batch not found' },
        },
      },
    },

    '/disbursements/{id}/retry-failed': {
      post: {
        tags: ['Disbursements'],
        summary: 'Retry failed items in a disbursement batch',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Retried failed transfers' },
          '400': { description: 'No failed items or batch already fully completed' },
          '404': { description: 'Batch not found' },
        },
      },
    },
  },
};
