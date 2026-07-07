import { MigrationInterface, QueryRunner } from "typeorm";

export class RemoveExpectedAmountFromAccount1783375466657 implements MigrationInterface {
    name = 'RemoveExpectedAmountFromAccount1783375466657'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN "expectedAmount"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "accounts" ADD "expectedAmount" bigint`);
    }

}
