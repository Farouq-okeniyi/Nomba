import { MigrationInterface, QueryRunner } from "typeorm";

export class ScopeDisbursementsToAccounts1783201804532 implements MigrationInterface {
    name = 'ScopeDisbursementsToAccounts1783201804532'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" DROP COLUMN "accountNumber"`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" DROP COLUMN "bankCode"`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" DROP COLUMN "accountName"`);
        await queryRunner.query(`ALTER TABLE "accounts" ADD "nombaBankCode" character varying`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" ADD "accountId" uuid NOT NULL`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" ADD "resolvedAccountNumber" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" ADD "resolvedBankCode" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" ADD "resolvedAccountName" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" ADD CONSTRAINT "FK_af42c69311f061fad1aeebd1863" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" DROP CONSTRAINT "FK_af42c69311f061fad1aeebd1863"`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" DROP COLUMN "resolvedAccountName"`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" DROP COLUMN "resolvedBankCode"`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" DROP COLUMN "resolvedAccountNumber"`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" DROP COLUMN "accountId"`);
        await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN "nombaBankCode"`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" ADD "accountName" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" ADD "bankCode" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" ADD "accountNumber" character varying NOT NULL`);
    }

}
