import { AuditLog } from '../../entities/AuditLog';

export interface AuditLogDto {
  id: string;
  object: 'audit_log';
  merchantId: string;
  entityType: string;
  entityId: string;
  action: string;
  previousState: object | null;
  newState: object;
  triggeredBy: string;
  createdAt: Date;
}

export const toAuditLogDto = (log: AuditLog): AuditLogDto => {
  return {
    id: log.id,
    object: 'audit_log',
    merchantId: log.merchantId,
    entityType: log.entityType,
    entityId: log.entityId,
    action: log.action,
    previousState: log.previousState || null,
    newState: log.newState,
    triggeredBy: log.triggeredBy,
    createdAt: log.createdAt,
  };
};
