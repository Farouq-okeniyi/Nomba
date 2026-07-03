import { AppDataSource } from '../config';
import { AuditLog } from '../entities/AuditLog';

const auditRepo = AppDataSource.getRepository(AuditLog);

interface AuditLogParams {
  merchantId: string;
  entityType: string;
  entityId: string;
  action: string;
  previousState?: any;
  newState?: any;
  triggeredBy?: string;
}

export const writeAuditLog = async (params: AuditLogParams): Promise<void> => {
  const log = auditRepo.create({
    merchantId: params.merchantId,
    entityType: params.entityType,
    entityId: params.entityId,
    action: params.action,
    previousState: params.previousState,
    newState: params.newState,
    triggeredBy: params.triggeredBy || 'system',
  });
  
  await auditRepo.save(log);
};
