import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAutoWorkOrderUniqueIndex1789900000000 implements MigrationInterface {
  name = 'AddAutoWorkOrderUniqueIndex1789900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_work_orders_one_open_auto_per_asset"
      ON "work_orders" ("asset_id")
      WHERE "status" IN ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'BLOCKED')
        AND "source" = 'AUTO'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_work_orders_one_open_auto_per_asset"`,
    );
  }
}
