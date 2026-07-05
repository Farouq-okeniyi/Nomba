import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeAccountIdOptionalOnDisbursement1783281743020 implements MigrationInterface {
    name = 'MakeAccountIdOptionalOnDisbursement1783281743020'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" DROP CONSTRAINT "FK_af42c69311f061fad1aeebd1863"`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" ALTER COLUMN "accountId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" ADD CONSTRAINT "FK_af42c69311f061fad1aeebd1863" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" DROP CONSTRAINT "FK_af42c69311f061fad1aeebd1863"`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" ALTER COLUMN "accountId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "disbursement_recipients" ADD CONSTRAINT "FK_af42c69311f061fad1aeebd1863" FOREIGN KEY ("accountId") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
