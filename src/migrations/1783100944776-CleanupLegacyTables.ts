import { MigrationInterface, QueryRunner } from "typeorm";

export class CleanupLegacyTables1783100944776 implements MigrationInterface {
    name = 'CleanupLegacyTables1783100944776'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Drop legacy tables that were replaced
        await queryRunner.query(`DROP TABLE IF EXISTS "disbursement_items" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "disbursement_batches" CASCADE`);
        await queryRunner.query(`DROP TABLE IF EXISTS "virtual_accounts" CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Usually down migration for dropped legacy tables is omitted or left empty
        // as reconstructing them would require recreating the full legacy schema
    }
}
