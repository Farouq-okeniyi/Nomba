import { Request, Response } from 'express';
import { Asyncly, respond } from '../../extension';
import { AuditLogsService } from './audit-logs.service';
import { toAuditLogDto } from './audit-logs.dto';

const listAuditLogs = Asyncly(async (req: Request, res: Response) => {
  const merchantId = req.merchant.id;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const entityType = req.query.entityType as string;
  const action = req.query.action as string;
  const entityId = req.query.entityId as string;

  const result = await AuditLogsService.listAuditLogs(merchantId, {
    page,
    limit,
    entityType,
    action,
    entityId,
  });

  // Temporarily use respond.ok to return envelope until refactor
  respond.ok(res, {
    object: 'list',
    data: result.data.map(toAuditLogDto),
    has_more: result.pagination.page < result.pagination.pages
  }, 'Audit logs fetched successfully');
});

export const auditLogsController = {
  listAuditLogs,
};
