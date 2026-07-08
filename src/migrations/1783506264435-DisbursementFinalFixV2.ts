import { MigrationInterface, QueryRunner } from "typeorm";

export class DisbursementFinalFixV21783506264435 implements MigrationInterface {
    name = 'DisbursementFinalFixV21783506264435'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" DROP CONSTRAINT "FK_af42c69311f061fad1aeebd1863"`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" RENAME COLUMN "accountId" TO "transactionId"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" RENAME COLUMN "transactionId" TO "accountId"`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" ADD CONSTRAINT "FK_af42c69311f061fad1aeebd1863" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
