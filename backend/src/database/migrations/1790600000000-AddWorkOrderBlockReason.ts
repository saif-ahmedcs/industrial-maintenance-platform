import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWorkOrderBlockReason1790600000000 implements MigrationInterface {
  name = 'AddWorkOrderBlockReason1790600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "work_orders" ADD "block_reason" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "work_orders" DROP COLUMN "block_reason"`,
    );
  }
}
