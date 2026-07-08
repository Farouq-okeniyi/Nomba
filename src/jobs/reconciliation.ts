import cron from 'node-cron';
import { AppDataSource, logger } from '../config';
import { Merchant } from '../entities/Merchant';
import { Transaction, TransactionStatus, TransactionType } from '../entities/Transaction';
import { ReconciliationLog, ReconciliationStatus } from '../entities/ReconciliationLog';
import { nombaClient as nombaApi } from '../nomba/nomba.client';
import { writeAuditLog } from '../extension/audit';

const merchantRepo = AppDataSource.getRepository(Merchant);
const transactionRepo = AppDataSource.getRepository(Transaction);
const reconciliationLogRepo = AppDataSource.getRepository(ReconciliationLog);

// Fetch ALL transactions from Nomba with pagination
async function fetchAllNombaTransactions(dateFrom: string, dateTo: string): Promise<any[]> {
  const allTransactions: any[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await nombaApi.get('/transactions', {
      params: {
        dateFrom,
        dateTo,
        status: 'success',
        page,
        limit: 100, // max per page — adjust if Nomba uses different param name
      },
    });

    const transactions = response.data?.transactions || [];
    allTransactions.push(...transactions);

    // Stop if we got fewer than the limit — no more pages
    if (transactions.length < 100) {
      hasMore = false;
    } else {
      page++;
    }
  }

  return allTransactions;
}

async function runReconciliationForMerchant(merchant: Merchant): Promise<void> {
  const now = new Date();
  const periodTo = new Date(now);
  const periodFrom = new Date(now);
  periodFrom.setHours(periodFrom.getHours() - 24);

  const dateFrom = periodFrom.toISOString().split('T')[0]; // YYYY-MM-DD
  const dateTo = periodTo.toISOString().split('T')[0];

  logger.info(`[Reconciliation] Running for merchant ${merchant.id} — ${dateFrom} to ${dateTo}`);

  try {
    // Step 1: Fetch all transactions from Nomba with pagination
    const nombaTransactions = await fetchAllNombaTransactions(dateFrom, dateTo);
    logger.info(`[Reconciliation] Fetched ${nombaTransactions.length} transactions from Nomba`);

    // Step 2: Fetch our local transactions for same period
    const localTransactions = await transactionRepo
      .createQueryBuilder('tx')
      .where('tx.merchantId = :merchantId', { merchantId: merchant.id })
      .andWhere('tx.createdAt >= :from', { from: periodFrom })
      .andWhere('tx.createdAt <= :to', { to: periodTo })
      .getMany();

    logger.info(`[Reconciliation] Found ${localTransactions.length} local transactions`);

    // Build lookup maps by merchantTxRef
    const nombaMap = new Map(
      nombaTransactions
        .filter(t => t.merchantTxRef) // only transactions with our ref
        .map(t => [t.merchantTxRef, t])
    );

    const localMap = new Map(
      localTransactions
        .filter(t => t.merchantTxRef)
        .map(t => [t.merchantTxRef, t])
    );

    // Step 3: Find ORPHANS — in Nomba but not in our DB
    const orphans: any[] = [];
    for (const [ref, nombaTx] of nombaMap.entries()) {
      if (!localMap.has(ref)) {
        orphans.push({
          merchantTxRef: ref,
          nombaAmount: nombaTx.transactionAmount,
          nombaTime: nombaTx.time,
          nombaTransactionId: nombaTx.transactionId,
        });
        logger.warn(`[Reconciliation] ORPHAN: ${ref} exists in Nomba but not in our DB`);
      }
    }

    // Step 4: Find DRIFTS — in both but amounts differ
    const drifts: any[] = [];
    for (const [ref, nombaTx] of nombaMap.entries()) {
      const localTx = localMap.get(ref);
      if (localTx && Number(localTx.amount) !== Number(nombaTx.transactionAmount)) {
        drifts.push({
          merchantTxRef: ref,
          localAmount: localTx.amount,
          nombaAmount: nombaTx.transactionAmount,
          difference: Number(nombaTx.transactionAmount) - Number(localTx.amount),
        });
        logger.warn(`[Reconciliation] DRIFT: ${ref} — local: ${localTx.amount}, Nomba: ${nombaTx.transactionAmount}`);
      }
    }

    // Step 5: Find MISSING — in our DB but not in Nomba
    // Only check SETTLED transactions — PENDING may not be in Nomba yet
    const missing: any[] = [];
    for (const [ref, localTx] of localMap.entries()) {
      if (
        localTx.status === TransactionStatus.SETTLED &&
        localTx.type === TransactionType.INBOUND &&
        !nombaMap.has(ref)
      ) {
        missing.push({
          merchantTxRef: ref,
          localAmount: localTx.amount,
          localCreatedAt: localTx.createdAt,
          transactionId: localTx.id,
        });
        logger.warn(`[Reconciliation] MISSING: ${ref} is SETTLED in our DB but not found in Nomba`);
      }
    }

    // Step 6: Determine status
    const status = orphans.length === 0 && drifts.length === 0 && missing.length === 0
      ? ReconciliationStatus.CLEAN
      : ReconciliationStatus.FLAGGED;

    // Step 7: Save reconciliation log
    const log = reconciliationLogRepo.create({
      merchantId: merchant.id,
      ranAt: now,
      periodFrom,
      periodTo,
      totalFetchedFromNomba: nombaTransactions.length,
      totalReconciled: localTransactions.length - orphans.length - drifts.length - missing.length,
      totalOrphans: orphans.length,
      totalDrift: drifts.length,
      totalMissing: missing.length,
      orphans,
      drifts,
      missing,
      status,
    });
    await reconciliationLogRepo.save(log);

    await writeAuditLog({
      merchantId: merchant.id,
      entityType: 'ReconciliationLog',
      entityId: log.id,
      action: `RECONCILIATION_${status}`,
      previousState: undefined,
      newState: {
        totalOrphans: orphans.length,
        totalDrift: drifts.length,
        totalMissing: missing.length,
        status,
      },
      triggeredBy: 'CRON:reconciliation',
    });

    logger.info(`[Reconciliation] Merchant ${merchant.id} — Status: ${status} | Orphans: ${orphans.length} | Drifts: ${drifts.length} | Missing: ${missing.length}`);

  } catch (error: any) {
    logger.error(`[Reconciliation] Failed for merchant ${merchant.id}: ${error.message}`);
  }
}

export const startReconciliationJob = () => {
  // Runs every night at 23:30 UTC (00:30 WAT)
  cron.schedule('30 23 * * *', async () => {
    logger.info('[Reconciliation] Starting nightly reconciliation run');

    const merchants = await merchantRepo.find({
      where: { status: 'ACTIVE' as any },
    });

    logger.info(`[Reconciliation] Processing ${merchants.length} merchants`);

    for (const merchant of merchants) {
      await runReconciliationForMerchant(merchant);
    }

    logger.info('[Reconciliation] Nightly reconciliation complete');
  });

  logger.info('[Reconciliation] Cron job scheduled (30 23 * * *)');
};
