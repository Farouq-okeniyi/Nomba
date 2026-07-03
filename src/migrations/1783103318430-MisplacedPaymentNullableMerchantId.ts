import { MigrationInterface, QueryRunner } from "typeorm";

export class MisplacedPaymentNullableMerchantId1783103318430 implements MigrationInterface {
    name = 'MisplacedPaymentNullableMerchantId1783103318430'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "misplaced_payments" ALTER COLUMN "merchantId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TYPE "public"."misplaced_payments_reason_enum" ADD VALUE 'ACCOUNT_NOT_FOUND'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."misplaced_payments_reason_enum_old" AS ENUM('ACCOUNT_SUSPENDED', 'ACCOUNT_CLOSED', 'NO_EXPECTATION_FOUND')`);
        await queryRunner.query(`ALTER TABLE "misplaced_payments" ALTER COLUMN "reason" TYPE "public"."misplaced_payments_reason_enum_old" USING "reason"::"text"::"public"."misplaced_payments_reason_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."misplaced_payments_reason_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."misplaced_payments_reason_enum_old" RENAME TO "misplaced_payments_reason_enum"`);
        await queryRunner.query(`ALTER TABLE "misplaced_payments" ALTER COLUMN "merchantId" SET NOT NULL`);
    }

}
