/**
 * Swagger definitions for the Accounts API
 */
export const accountsDocs = {
  paths: {
    '/accounts': {
      post: {
        tags: ['Accounts'],
        summary: 'Provision a new Nomba virtual account',
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
        summary: 'List all provisioned accounts',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'List of accounts' },
        },
      },
    },

    '/accounts/{id}': {
      get: {
        tags: ['Accounts'],
        summary: 'Get virtual account details',
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
        summary: 'Update virtual account details',
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
                  kycTier:     { type: 'integer', example: 2 },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Account updated successfully' },
        },
      },
      delete: {
        tags: ['Accounts'],
        summary: 'Close virtual account',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Account suspended and closed locally' },
        },
      },
    },

    '/accounts/{id}/suspend': {
      post: {
        tags: ['Accounts'],
        summary: 'Suspend virtual account',
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
        summary: 'Reactivate virtual account',
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
