/**
 * Swagger definitions for the Misplaced Payments API
 */
export const misplacedPaymentsDocs = {
  paths: {
    '/misplaced-payments': {
      get: {
        tags: ['Misplaced Payments'],
        operationId: 'listMisplacedPayments',
        summary: 'List all misplaced/unmatched payments (merchant-scoped)',
        description: 'Returns all inbound payments that could not be matched to an active account (suspended, closed, or unknown account number).',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'List of misplaced payments' },
        },
      },
    },

    '/misplaced-payments/{id}': {
      get: {
        tags: ['Misplaced Payments'],
        operationId: 'getMisplacedPayment',
        summary: 'Get misplaced payment details',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': { description: 'Misplaced payment details' },
          '404': { description: 'Record not found' },
        },
      },
    },

    '/misplaced-payments/{id}/resolve': {
      post: {
        tags: ['Misplaced Payments'],
        operationId: 'resolveMisplacedPayment',
        summary: 'Resolve a misplaced payment',
        description: `Resolves a misplaced payment using one of three actions:
- **REFUND**: Initiates an outbound bank transfer back to the customer. You must provide \`senderAccountNumber\` and \`senderBankCode\`.
- **REROUTE**: Manually re-assigns the funds to a different, valid account. You must provide the \`targetAccountId\`.
- **WRITE_OFF**: Keeps the funds in the merchant wallet and closes the misplaced record. No extra fields required.`,
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'path', name: 'id', required: true, schema: { type: 'string' }, description: 'The UUID of the misplaced payment' },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                oneOf: [
                  {
                    title: 'Resolve via Reroute',
                    type: 'object',
                    required: ['action', 'note', 'resolvedBy', 'targetAccountId'],
                    properties: {
                      action: { type: 'string', enum: ['REROUTE'] },
                      note: { type: 'string', description: 'Internal note regarding this resolution.' },
                      resolvedBy: { type: 'string', description: 'The admin resolving this payment.' },
                      targetAccountId: { type: 'string', format: 'uuid', description: 'The UUID of the account that should receive the funds.' },
                    },
                  },
                  {
                    title: 'Resolve via Refund',
                    type: 'object',
                    required: ['action', 'note', 'resolvedBy', 'senderAccountNumber', 'senderBankCode'],
                    properties: {
                      action: { type: 'string', enum: ['REFUND'] },
                      note: { type: 'string', description: 'Internal note regarding this resolution.' },
                      resolvedBy: { type: 'string', description: 'The admin resolving this payment.' },
                      senderAccountNumber: { type: 'string', description: 'The 10-digit NUBAN to send the money to.' },
                      senderBankCode: { type: 'string', description: 'The 3-digit bank code for the destination bank.' },
                    },
                  },
                  {
                    title: 'Resolve via Write-Off',
                    type: 'object',
                    required: ['action', 'note', 'resolvedBy'],
                    properties: {
                      action: { type: 'string', enum: ['WRITE_OFF'] },
                      note: { type: 'string', description: 'Internal note regarding this resolution.' },
                      resolvedBy: { type: 'string', description: 'The admin resolving this payment.' },
                    },
                  },
                ],
              },
              examples: {
                reroute: {
                  summary: 'Resolve via Reroute',
                  value: {
                    action: 'REROUTE',
                    note: 'Assigned to correct merchant account',
                    resolvedBy: 'Admin_Jane',
                    targetAccountId: '3fa85f64-5717-4562-b3fc-2c963f66afa6'
                  }
                },
                refund: {
                  summary: 'Resolve via Refund',
                  value: {
                    action: 'REFUND',
                    note: 'Customer requested refund via support',
                    resolvedBy: 'Admin_John',
                    senderAccountNumber: '0123456789',
                    senderBankCode: '058'
                  }
                },
                writeOff: {
                  summary: 'Resolve via Write-Off',
                  value: {
                    action: 'WRITE_OFF',
                    note: 'Amount too small for refund transfer fees',
                    resolvedBy: 'Admin_Jane'
                  }
                }
              }
            },
          },
        },
        responses: {
          '200': { description: 'Payment resolved successfully' },
          '400': { description: 'Bad Request (e.g. missing required fields for the chosen action)' },
        },
      },
    },
  },
};
