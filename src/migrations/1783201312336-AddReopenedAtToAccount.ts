import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReopenedAtToAccount1783201312336 implements MigrationInterface {
    name = 'AddReopenedAtToAccount1783201312336'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "accounts" ADD "reopenedAt" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN "reopenedAt"`);
    }

}
