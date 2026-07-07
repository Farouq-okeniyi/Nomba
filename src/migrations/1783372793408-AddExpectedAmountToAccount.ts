import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExpectedAmountToAccount1783372793408 implements MigrationInterface {
    name = 'AddExpectedAmountToAccount1783372793408'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "accounts" ADD "expectedAmount" bigint`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN "expectedAmount"`);
    }

}
