import { MigrationInterface, QueryRunner } from "typeorm";

export class DropMerchantApiKeysTable1783105909809 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS "merchant_api_keys" CASCADE`);
        await queryRunner.query(`DROP TYPE IF EXISTS "public"."merchant_api_keys_status_enum" CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
