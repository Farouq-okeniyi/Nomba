import { MigrationInterface, QueryRunner } from "typeorm";

export class DropLegacyVirtualAccounts1783449189339 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "virtual_accounts" CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Cannot cleanly revert a dropped legacy table with unknown schema
    }

}
