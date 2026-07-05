/**
 * Swagger definitions for the Merchants API
 */
export const merchantsDocs = {
  paths: {
    '/merchants/register': {
      post: {
        tags: ['Merchants'],
        summary: 'Register a new merchant and get initial API key',
        description: [
          'Creates a new merchant account and returns a one-time API key and recovery code.',
          '',
          '⚠️ **IMPORTANT — Save these credentials now. They cannot be shown again:**',
          '- `apiKey` — used to authenticate all API requests',
          '- `recoveryCode` — used to regenerate your API key if it is lost (format: `REC-XXXXXXXX`)',
          '',
          'If you lose both your API key and recovery code, your account cannot be recovered.',
        ].join('\n'),
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['businessName', 'email'],
                properties: {
                  businessName: { type: 'string', example: 'Acme Corp' },
                  email:        { type: 'string', example: 'admin@acmecorp.com' },
                  phone:        { type: 'string', example: '08012345678' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Merchant registered. ⚠️ Store `apiKey` and `recoveryCode` — shown once only.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status:  { type: 'integer', example: 201 },
                    message: { type: 'string',  example: '⚠️ Save your apiKey and recoveryCode now. They cannot be shown again.' },
                    data: {
                      type: 'object',
                      properties: {
                        merchantId:   { type: 'string', example: 'uuid' },
                        businessName: { type: 'string', example: 'Acme Corp' },
                        apiKey:       { type: 'string', example: 'nva_live_xxxxxxxxxxxx' },
                        recoveryCode: { type: 'string', example: 'REC-47291836' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    '/merchants/keys/regenerate': {
      post: {
        tags: ['Merchants'],
        summary: 'Regenerate API key using recovery code (no auth required)',
        description: [
          'Regenerates the API key for a merchant using their `email` and `recoveryCode`.',
          'No bearer token is required — this endpoint is specifically for recovering a lost API key.',
          '',
          '- The old API key is **immediately invalidated**.',
          '- The recovery code is **never rotated** — it remains the same after key regeneration.',
          '- ⚠️ If you have lost your recovery code, your account cannot be recovered.',
        ].join('\n'),
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'recoveryCode'],
                properties: {
                  email:        { type: 'string', example: 'admin@acmecorp.com' },
                  recoveryCode: { type: 'string', example: 'REC-47291836' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'New API key generated. Old key is now invalid.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'integer', example: 200 },
                    data: {
                      type: 'object',
                      properties: {
                        apiKey: { type: 'string', example: 'nva_live_xxxxxxxxxxxx' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Invalid credentials (wrong email or recovery code)' },
        },
      },
    },

    '/merchants/webhook': {
      put: {
        tags: ['Merchants'],
        summary: 'Update merchant webhook URL',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['webhookUrl'],
                properties: {
                  webhookUrl: { type: 'string', example: 'https://yourapp.com/webhooks/nomba' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Webhook URL updated' },
        },
      },
    },
  },
};
