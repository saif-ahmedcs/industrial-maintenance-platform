import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInventoryCheckConstraints1790000000000 implements MigrationInterface {
  name = 'AddInventoryCheckConstraints1790000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "spare_parts" ADD CONSTRAINT "CHK_spare_parts_quantity_non_negative" CHECK ("quantity_on_hand" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "spare_parts" ADD CONSTRAINT "CHK_spare_parts_reorder_threshold_non_negative" CHECK ("reorder_threshold" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "spare_parts" ADD CONSTRAINT "CHK_spare_parts_unit_cost_non_negative" CHECK ("unit_cost" >= 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" ADD CONSTRAINT "CHK_inventory_transactions_delta_non_zero" CHECK ("delta_quantity" <> 0)`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" ADD CONSTRAINT "CHK_inventory_transactions_resulting_quantity_non_negative" CHECK ("resulting_quantity" >= 0)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP CONSTRAINT "CHK_inventory_transactions_resulting_quantity_non_negative"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP CONSTRAINT "CHK_inventory_transactions_delta_non_zero"`,
    );
    await queryRunner.query(
      `ALTER TABLE "spare_parts" DROP CONSTRAINT "CHK_spare_parts_unit_cost_non_negative"`,
    );
    await queryRunner.query(
      `ALTER TABLE "spare_parts" DROP CONSTRAINT "CHK_spare_parts_reorder_threshold_non_negative"`,
    );
    await queryRunner.query(
      `ALTER TABLE "spare_parts" DROP CONSTRAINT "CHK_spare_parts_quantity_non_negative"`,
    );
  }
}
