import cron from 'node-cron';
import { AppDataSource, logger } from '../config';
import { Merchant } from '../entities/Merchant';
import { Transaction } from '../entities/Transaction';
import { ReconciliationLog, ReconciliationStatus } from '../entities/ReconciliationLog';
import { fetchTransactions } from '../nomba/nomba.api';
import { OutboundService } from '../modules/webhook/outbound.service';

const merchantRepo = AppDataSource.getRepository(Merchant);
const transactionRepo = AppDataSource.getRepository(Transaction);
const reconRepo = AppDataSource.getRepository(ReconciliationLog);

export const startReconciliationJob = () => {
  logger.info('[Reconciliation] Cron job scheduled (0 30 23 * * *)');
  
  // Schedule: 11:30 PM UTC everyday
  cron.schedule('0 30 23 * * *', async () => {
    logger.info('[Reconciliation] Starting nightly reconciliation job');
    
    try {
      const merchants = await merchantRepo.find();
      
      const dateTo = new Date();
      const dateFrom = new Date();
      dateFrom.setHours(dateFrom.getHours() - 24);
      
      const toStr = dateTo.toISOString().split('T')[0];
      const fromStr = dateFrom.toISOString().split('T')[0];
      
      for (const merchant of merchants) {
        try {
          const nombaRes = await fetchTransactions(fromStr, toStr);
          const nombaTxs = nombaRes.data?.data || [];
          
          const localTxs = await transactionRepo.find({
            where: { merchantId: merchant.id },
          });
          
          // simplified mock implementation for Hackathon scaffolding
          const orphans: any[] = [];
          const drifts: any[] = [];
          const missing: any[] = [];
          
          const status = (orphans.length > 0 || drifts.length > 0 || missing.length > 0) 
            ? ReconciliationStatus.FLAGGED 
            : ReconciliationStatus.CLEAN;
            
          const log = reconRepo.create({
            merchantId: merchant.id,
            periodFrom: dateFrom,
            periodTo: dateTo,
            ranAt: new Date(),
            totalFetchedFromNomba: nombaTxs.length,
            totalReconciled: localTxs.length,
            totalOrphans: orphans.length,
            totalDrift: drifts.length,
            totalMissing: missing.length,
            orphans: orphans,
            drifts: drifts,
            missing: missing,
            status,
          });
          await reconRepo.save(log);
          
          if (status === ReconciliationStatus.FLAGGED) {
            await OutboundService.fireWebhook(merchant.id, 'reconciliation.flagged', {
              date: dateTo.toISOString(),
              summary: { orphans: orphans.length, drifts: drifts.length, missing: missing.length }
            });
          }
        } catch (e: any) {
          logger.error(`[Reconciliation] Failed for merchant ${merchant.id}: ${e.message}`);
        }
      }
    } catch (error: any) {
      logger.error(`[Reconciliation] Job failed: ${error.message}`);
    }
  });
};
