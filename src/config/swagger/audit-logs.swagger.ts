/**
 * Swagger definitions for the Audit Logs API
 */
export const auditLogsDocs = {
  paths: {
    '/audit-logs': {
      get: {
        tags: ['Audit Logs'],
        operationId: 'listAuditLogs',
        summary: 'List merchant audit logs',
        description: 'Returns all immutable audit logs representing state changes across the merchant account.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { in: 'query', name: 'page', schema: { type: 'integer' }, description: 'Page number (default 1)' },
          { in: 'query', name: 'limit', schema: { type: 'integer' }, description: 'Results per page (default 50)' },
          { in: 'query', name: 'entityType', schema: { type: 'string' }, description: 'Filter by entity type (e.g. Account, Transaction)' },
          { in: 'query', name: 'action', schema: { type: 'string' }, description: 'Filter by action (e.g. ACCOUNT_CREATED)' },
          { in: 'query', name: 'entityId', schema: { type: 'string', format: 'uuid' }, description: 'Filter by specific entity ID' },
        ],
        responses: {
          '200': { description: 'List of audit logs' },
        },
      },
    },
  },
};
