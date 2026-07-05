/**
 * backfill-recovery-codes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time script: generates a recovery code for every merchant that currently
 * has no recoveryCodeHash, saves the hash to the DB, and prints the raw codes
 * to stdout so you can record them.
 *
 * Usage:
 *   npx ts-node src/scripts/backfill-recovery-codes.ts
 */

import 'reflect-metadata';
import crypto from 'crypto';
import { AppDataSource } from '../config';
import { Merchant } from '../entities/Merchant';

async function main() {
  await AppDataSource.initialize();
  console.log('✅ Database connected.\n');

  const merchantRepo = AppDataSource.getRepository(Merchant);

  // Find all merchants without a recovery code
  const merchants = await merchantRepo
    .createQueryBuilder('m')
    .where('m.recoveryCodeHash IS NULL')
    .getMany();

  if (merchants.length === 0) {
    console.log('✅ All merchants already have a recovery code. Nothing to do.');
    await AppDataSource.destroy();
    return;
  }

  console.log(`Found ${merchants.length} merchant(s) missing a recovery code.\n`);
  console.log('='.repeat(90));
  console.log('⚠️  SAVE THESE CODES — they will NOT be shown again after this script runs.');
  console.log('='.repeat(90));
  console.log(
    'merchantId'.padEnd(38) +
    'email'.padEnd(35) +
    'recoveryCode'
  );
  console.log('-'.repeat(90));

  for (const merchant of merchants) {
    // Generate: REC-8 random digits
    const rawCode = `REC-${Math.floor(10000000 + Math.random() * 90000000)}`;
    const hash = crypto.createHash('sha256').update(rawCode).digest('hex');

    merchant.recoveryCodeHash = hash;
    await merchantRepo.save(merchant);

    console.log(
      merchant.id.padEnd(38) +
      merchant.email.padEnd(35) +
      rawCode
    );
  }

  console.log('-'.repeat(90));
  console.log(`\n✅ Backfill complete. ${merchants.length} merchant(s) updated.\n`);
  console.log('⚠️  The raw codes above are the ONLY time they will be visible. Store them securely.\n');

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error('❌ Backfill failed:', err);
  process.exit(1);
});
