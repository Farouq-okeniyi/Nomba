import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRecoveryCodeHashToMerchants1783285110377 implements MigrationInterface {
    name = 'AddRecoveryCodeHashToMerchants1783285110377'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "merchants" ADD "recoveryCodeHash" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "merchants" DROP COLUMN "recoveryCodeHash"`);
    }

}
