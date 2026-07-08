/**
 * Swagger definitions for the Disbursements API
 */
export const disbursementsDocs = {
  paths: {
    '/disbursements': {
      post: {
        tags: ['Disbursements'],
        operationId: 'createDisbursementBatch',
        summary: 'Create and execute a bulk disbursement batch (Synchronous processing)',
        description: 'Executes a bulk transfer to multiple recipients (any valid Nigerian bank account) in a single request. Each recipient is tracked individually for success or failure.',
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
          '201': { description: 'Batch created and transfers executed. Returns the final disbursement status.' },
          '400': { description: 'Validation failed or duplicate reference' },
        },
      },
      get: {
        tags: ['Disbursements'],
        operationId: 'listDisbursements',
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
        operationId: 'getDisbursement',
        summary: 'Get batch details with recipient items',
        description: 'Returns full batch status along with each recipient\'s individual transfer outcome.',
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
        operationId: 'retryFailedDisbursements',
        summary: 'Retry failed items in a disbursement batch',
        description: 'Re-attempts only the recipients marked FAILED in a given batch, using the original merchantTxRef for each.',
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
