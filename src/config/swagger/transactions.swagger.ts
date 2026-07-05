/**
 * Swagger definitions for the Transactions API
 */
export const transactionsDocs = {
  paths: {
    '/accounts/{accountId}/transactions': {
      get: {
        tags: ['Transactions'],
        summary: 'List all transactions for an account',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'accountId', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'List of transactions for the account' },
          '404': { description: 'Account not found' },
        },
      },
    },

    '/accounts/{accountId}/statement': {
      get: {
        tags: ['Transactions'],
        summary: 'Generate a transaction statement for an account',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'accountId', required: true, schema: { type: 'string' } },
          {
            in: 'query',
            name: 'format',
            schema: { type: 'string', enum: ['json', 'csv'] },
            description: 'Response format (default json)',
          },
        ],
        responses: {
          '200': { description: 'Account statement' },
        },
      },
    },

    '/transactions/{merchantTxRef}': {
      get: {
        tags: ['Transactions'],
        summary: 'Get a transaction by merchant reference',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'merchantTxRef', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Transaction details' },
          '404': { description: 'Transaction not found' },
        },
      },
    },

    '/statements': {
      get: {
        tags: ['Transactions'],
        summary: 'Get merchant-level statement (all accounts)',
        description: 'Returns all transactions across all virtual accounts under the authenticated merchant.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'from',   schema: { type: 'string' }, description: 'Filter from date (ISO 8601)' },
          { in: 'query', name: 'to',     schema: { type: 'string' }, description: 'Filter to date (ISO 8601)' },
          { in: 'query', name: 'format', schema: { type: 'string', enum: ['json', 'csv'] }, description: 'Response format (default json)' },
          { in: 'query', name: 'page',   schema: { type: 'integer' }, description: 'Page number (default 1)' },
          { in: 'query', name: 'limit',  schema: { type: 'integer' }, description: 'Results per page (default 50)' },
        ],
        responses: {
          '200': { description: 'Merchant statement' },
          '401': { description: 'Unauthorized' },
        },
      },
    },
  },
};
