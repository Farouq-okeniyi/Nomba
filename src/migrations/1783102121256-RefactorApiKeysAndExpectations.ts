import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorApiKeysAndExpectations1783102121256 implements MigrationInterface {
    name = 'RefactorApiKeysAndExpectations1783102121256'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payment_expectations" DROP COLUMN "installmentCount"`);
        
        // Add columns as nullable first
        await queryRunner.query(`ALTER TABLE "merchants" ADD "apiKeyHash" character varying`);
        await queryRunner.query(`ALTER TABLE "merchants" ADD "apiKeyPrefix" character varying`);
        
        // Populate existing rows with dummy values based on UUID so unique constraint passes
        await queryRunner.query(`UPDATE "merchants" SET "apiKeyHash" = id::text, "apiKeyPrefix" = 'migrated'`);
        
        // Apply NOT NULL constraints
        await queryRunner.query(`ALTER TABLE "merchants" ALTER COLUMN "apiKeyHash" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "merchants" ALTER COLUMN "apiKeyPrefix" SET NOT NULL`);
        
        await queryRunner.query(`ALTER TABLE "merchants" ADD CONSTRAINT "UQ_89eceb51b685ced892c92e1cbc8" UNIQUE ("apiKeyHash")`);
        await queryRunner.query(`ALTER TABLE "merchants" ADD "apiKeyLastUsedAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "merchants" DROP COLUMN "apiKeyLastUsedAt"`);
        await queryRunner.query(`ALTER TABLE "merchants" DROP COLUMN "apiKeyPrefix"`);
        await queryRunner.query(`ALTER TABLE "merchants" DROP CONSTRAINT "UQ_89eceb51b685ced892c92e1cbc8"`);
        await queryRunner.query(`ALTER TABLE "merchants" DROP COLUMN "apiKeyHash"`);
        await queryRunner.query(`ALTER TABLE "payment_expectations" ADD "installmentCount" integer NOT NULL DEFAULT '0'`);
    }

}
