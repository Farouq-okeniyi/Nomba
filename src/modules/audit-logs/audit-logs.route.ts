import express from 'express';
import { auditLogsController } from './audit-logs.controller';

const router = express.Router();

router.get('/', auditLogsController.listAuditLogs);

export { router as auditLogsRoute };
