import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMaintenanceAndWorkOrders1789865587573 implements MigrationInterface {
  name = 'CreateMaintenanceAndWorkOrders1789865587573';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "spare_parts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "sku" character varying NOT NULL, "name" character varying NOT NULL, "quantity_on_hand" integer NOT NULL DEFAULT '0', "reorder_threshold" integer NOT NULL DEFAULT '0', "unit_cost" numeric(10,2) NOT NULL, CONSTRAINT "UQ_9ceb95e5fd4da2b9601c85b5f80" UNIQUE ("sku"), CONSTRAINT "PK_6fe9b0bb96e021d248731580f1b" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "maintenance_plans" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "asset_id" uuid NOT NULL, "name" character varying NOT NULL, "interval_days" integer NOT NULL, "last_completed_at" TIMESTAMP, "next_due_at" TIMESTAMP, "active" boolean NOT NULL DEFAULT true, CONSTRAINT "PK_bc2a330993cedb65505a154ac5d" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_1dca207a53bd84ca0d1351d8bf" ON "maintenance_plans"  ("next_due_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_555009340c8b6f2fd57945d9ff" ON "maintenance_plans"  ("asset_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "maintenance_tasks" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "plan_id" uuid NOT NULL, "description" character varying NOT NULL, "order_index" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_a9cc63a718de2f4e13657c1942a" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_5cea1151ca67ce10cbf4c7f05b" ON "maintenance_tasks"  ("plan_id") `,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."work_orders_status_enum" AS ENUM('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."work_orders_source_enum" AS ENUM('MANUAL', 'PLANNED', 'AUTO')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."work_orders_priority_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')`,
    );
    await queryRunner.query(
      `CREATE TABLE "work_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "asset_id" uuid NOT NULL, "maintenance_plan_id" uuid, "status" "public"."work_orders_status_enum" NOT NULL DEFAULT 'OPEN', "source" "public"."work_orders_source_enum" NOT NULL DEFAULT 'MANUAL', "priority" "public"."work_orders_priority_enum" NOT NULL DEFAULT 'MEDIUM', "assigned_to_user_id" uuid, "description" text NOT NULL, "opened_at" TIMESTAMP NOT NULL DEFAULT now(), "assigned_at" TIMESTAMP, "started_at" TIMESTAMP, "completed_at" TIMESTAMP, "cancelled_at" TIMESTAMP, "total_cost" numeric(10,2), CONSTRAINT "PK_29f6c1884082ee6f535aed93660" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_cf0959e85fe943c75dd63eacc8" ON "work_orders"  ("maintenance_plan_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_37b9bf9bcadfa42a2ceec201ec" ON "work_orders"  ("assigned_to_user_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_84a22e7f4761f9b56f06b48cd6" ON "work_orders"  ("status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_6acc2f84a644b656a49aaa1c20" ON "work_orders"  ("asset_id", "status") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_126340904f11c6cefdafad3675" ON "work_orders"  ("asset_id") `,
    );
    await queryRunner.query(
      `CREATE TABLE "work_order_parts" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "work_order_id" uuid NOT NULL, "spare_part_id" uuid NOT NULL, "quantity_used" integer NOT NULL, "unit_cost_at_completion" numeric(10,2) NOT NULL, CONSTRAINT "PK_f940468276c041deed13cd240cc" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_ad836a5f1df9d1aa2c5b539762" ON "work_order_parts"  ("spare_part_id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_f0cd99de92dd30d18f97bf3e51" ON "work_order_parts"  ("work_order_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "maintenance_plans" ADD CONSTRAINT "FK_555009340c8b6f2fd57945d9ff4" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "maintenance_tasks" ADD CONSTRAINT "FK_5cea1151ca67ce10cbf4c7f05b8" FOREIGN KEY ("plan_id") REFERENCES "maintenance_plans"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" ADD CONSTRAINT "FK_126340904f11c6cefdafad36755" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" ADD CONSTRAINT "FK_cf0959e85fe943c75dd63eacc8f" FOREIGN KEY ("maintenance_plan_id") REFERENCES "maintenance_plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" ADD CONSTRAINT "FK_37b9bf9bcadfa42a2ceec201ec4" FOREIGN KEY ("assigned_to_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_order_parts" ADD CONSTRAINT "FK_f0cd99de92dd30d18f97bf3e51b" FOREIGN KEY ("work_order_id") REFERENCES "work_orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_order_parts" ADD CONSTRAINT "FK_ad836a5f1df9d1aa2c5b5397622" FOREIGN KEY ("spare_part_id") REFERENCES "spare_parts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "work_order_parts" DROP CONSTRAINT "FK_ad836a5f1df9d1aa2c5b5397622"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_order_parts" DROP CONSTRAINT "FK_f0cd99de92dd30d18f97bf3e51b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" DROP CONSTRAINT "FK_37b9bf9bcadfa42a2ceec201ec4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" DROP CONSTRAINT "FK_cf0959e85fe943c75dd63eacc8f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "work_orders" DROP CONSTRAINT "FK_126340904f11c6cefdafad36755"`,
    );
    await queryRunner.query(
      `ALTER TABLE "maintenance_tasks" DROP CONSTRAINT "FK_5cea1151ca67ce10cbf4c7f05b8"`,
    );
    await queryRunner.query(
      `ALTER TABLE "maintenance_plans" DROP CONSTRAINT "FK_555009340c8b6f2fd57945d9ff4"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_f0cd99de92dd30d18f97bf3e51"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_ad836a5f1df9d1aa2c5b539762"`,
    );
    await queryRunner.query(`DROP TABLE "work_order_parts"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_126340904f11c6cefdafad3675"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_6acc2f84a644b656a49aaa1c20"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_84a22e7f4761f9b56f06b48cd6"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_37b9bf9bcadfa42a2ceec201ec"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_cf0959e85fe943c75dd63eacc8"`,
    );
    await queryRunner.query(`DROP TABLE "work_orders"`);
    await queryRunner.query(`DROP TYPE "public"."work_orders_priority_enum"`);
    await queryRunner.query(`DROP TYPE "public"."work_orders_source_enum"`);
    await queryRunner.query(`DROP TYPE "public"."work_orders_status_enum"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_5cea1151ca67ce10cbf4c7f05b"`,
    );
    await queryRunner.query(`DROP TABLE "maintenance_tasks"`);
    await queryRunner.query(
      `DROP INDEX "public"."IDX_555009340c8b6f2fd57945d9ff"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_1dca207a53bd84ca0d1351d8bf"`,
    );
    await queryRunner.query(`DROP TABLE "maintenance_plans"`);
    await queryRunner.query(`DROP TABLE "spare_parts"`);
  }
}
