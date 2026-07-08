import { AppDataSource } from '../../config';
import { AuditLog } from '../../entities/AuditLog';

const auditLogRepository = AppDataSource.getRepository(AuditLog);

export interface AuditLogFilters {
  page: number;
  limit: number;
  entityType?: string;
  action?: string;
  entityId?: string;
}

export class AuditLogsService {
  static async listAuditLogs(merchantId: string, filters: AuditLogFilters) {
    const { page, limit, entityType, action, entityId } = filters;

    const query = auditLogRepository.createQueryBuilder('log')
      .where('log.merchantId = :merchantId', { merchantId })
      .orderBy('log.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (entityType) {
      query.andWhere('log.entityType = :entityType', { entityType });
    }
    if (action) {
      query.andWhere('log.action = :action', { action });
    }
    if (entityId) {
      query.andWhere('log.entityId = :entityId', { entityId });
    }

    const [logs, total] = await query.getManyAndCount();

    return {
      data: logs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
