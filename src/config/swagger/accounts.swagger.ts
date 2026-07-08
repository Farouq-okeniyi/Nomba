/**
 * Swagger definitions for the Accounts API
 */
export const accountsDocs = {
  paths: {
    '/accounts': {
      post: {
        tags: ['Accounts'],
        operationId: 'createVirtualAccount',
        summary: 'Provision a new Nomba virtual account',
        description: 'Provisions a dedicated NUBAN for a customer, tied to their identity across all future transactions. Automatically creates a linked payment expectation.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['firstName', 'lastName', 'email', 'phone'],
                properties: {
                  firstName: { type: 'string', example: 'John' },
                  lastName:  { type: 'string', example: 'Doe' },
                  email:     { type: 'string', example: 'john.doe@example.com' },
                  phone:     { type: 'string', example: '08012345678' },
                  bvn:       { type: 'string', example: '12345678901' },
                  nin:       { type: 'string', example: '12345678901' },
                  expectedAmount: { type: 'integer', example: 10000, description: 'Optional expected amount in kobo (minimum 10000). Auto-creates a Payment Expectation.' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Account successfully provisioned' },
          '400': { description: 'Validation failed' },
        },
      },
      get: {
        tags: ['Accounts'],
        operationId: 'listAccounts',
        summary: 'List all provisioned accounts',
        description: 'Returns all virtual accounts provisioned under the authenticated merchant.',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'List of accounts' },
        },
      },
    },

    '/accounts/{id}': {
      get: {
        tags: ['Accounts'],
        operationId: 'getAccount',
        summary: 'Get virtual account details',
        description: 'Returns full details for a single virtual account, including current status and linked payment expectation.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Account details' },
          '404': { description: 'Account not found' },
        },
      },
      put: {
        tags: ['Accounts'],
        operationId: 'updateAccount',
        summary: 'Update virtual account details',
        description: 'Updates customer details on an existing virtual account (e.g. name, KYC tier).',
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
                properties: {
                  accountName: { type: 'string', example: 'Updated Name' },
                  expectedAmount: { type: 'integer', example: 25000, description: 'Optional expected amount in kobo.' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Account updated successfully' },
        },
      },
    },

    '/accounts/{id}/suspend': {
      post: {
        tags: ['Accounts'],
        operationId: 'suspendAccount',
        summary: 'Suspend virtual account',
        description: 'Suspends the account on Nomba and marks it inactive locally. Any inbound payment to a suspended account is automatically diverted to misplaced-payment handling instead of being credited.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Account suspended successfully' },
        },
      },
    },

    '/accounts/{id}/reactivate': {
      post: {
        tags: ['Accounts'],
        operationId: 'reactivateAccount',
        summary: 'Reactivate virtual account',
        description: 'Reactivates a previously suspended account on both Nomba and locally, restoring normal inbound payment processing.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Account reactivated successfully' },
        },
      },
    },
  },
};
