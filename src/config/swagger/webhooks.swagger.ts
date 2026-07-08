/**
 * Swagger definitions for the Webhooks API
 */
export const webhooksDocs = {
  paths: {
    '/webhooks/nomba': {
      post: {
        tags: ['Webhooks'],
        operationId: 'receiveNombaWebhook',
        summary: 'Receive Nomba payment event',
        description: 'Verifies the HMAC-SHA256 signature on every incoming event before processing. Duplicate requestId values are rejected to guarantee idempotency.',
        parameters: [
          {
            in: 'header',
            name: 'nomba-signature',
            required: true,
            schema: { type: 'string' },
            description: 'HMAC-SHA256 signature of the raw request body using the Nomba webhook signing key',
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WebhookPayload' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Event acknowledged',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WebhookAckResponse' },
              },
            },
          },
          '400': {
            description: 'Invalid payload',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ValidationErrorResponse' },
              },
            },
          },
          '401': {
            description: 'Missing or invalid signature headers',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '500': {
            description: 'Server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
  },
};
