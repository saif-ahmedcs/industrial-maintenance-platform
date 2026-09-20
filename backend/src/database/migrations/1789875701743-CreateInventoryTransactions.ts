import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateInventoryTransactions1789875701743 implements MigrationInterface {
  name = 'CreateInventoryTransactions1789875701743';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."inventory_transactions_reason_enum" AS ENUM('CONSUMED', 'RESTOCK', 'ADJUSTMENT')`,
    );
    await queryRunner.query(
      `CREATE TABLE "inventory_transactions" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "spare_part_id" uuid NOT NULL, "delta_quantity" integer NOT NULL, "reason" "public"."inventory_transactions_reason_enum" NOT NULL, "work_order_id" uuid, "created_by_user_id" uuid, "resulting_quantity" integer NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9b7144851f08f9eededde7edd42" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0fac3f04dbb69cc569e5552d3e" ON "inventory_transactions"  ("work_order_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_056319a6194edc9898542e49ce" ON "inventory_transactions"  ("spare_part_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" ADD CONSTRAINT "FK_056319a6194edc9898542e49ceb" FOREIGN KEY ("spare_part_id") REFERENCES "spare_parts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" ADD CONSTRAINT "FK_0fac3f04dbb69cc569e5552d3e7" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" ADD CONSTRAINT "FK_1fc511ea0d8c919c22f51543cad" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP CONSTRAINT "FK_1fc511ea0d8c919c22f51543cad"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP CONSTRAINT "FK_0fac3f04dbb69cc569e5552d3e7"`,
    );
    await queryRunner.query(
      `ALTER TABLE "inventory_transactions" DROP CONSTRAINT "FK_056319a6194edc9898542e49ceb"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_056319a6194edc9898542e49ce"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0fac3f04dbb69cc569e5552d3e"`,
    );
    await queryRunner.query(`DROP TABLE "inventory_transactions"`);
    await queryRunner.query(
      `DROP TYPE "public"."inventory_transactions_reason_enum"`,
    );
  }
}
