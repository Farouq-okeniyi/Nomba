import { MigrationInterface, QueryRunner } from "typeorm";

export class CorrectDisbursementsRecipientModel1783202432385 implements MigrationInterface {
    name = 'CorrectDisbursementsRecipientModel1783202432385'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" DROP COLUMN "resolvedAccountNumber"`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" DROP COLUMN "resolvedBankCode"`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" DROP COLUMN "resolvedAccountName"`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" ADD "accountNumber" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" ADD "bankCode" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" ADD "accountName" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" DROP COLUMN "accountName"`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" DROP COLUMN "bankCode"`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" DROP COLUMN "accountNumber"`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" ADD "resolvedAccountName" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" ADD "resolvedBankCode" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" ADD "resolvedAccountNumber" character varying NOT NULL`);
    }

}
