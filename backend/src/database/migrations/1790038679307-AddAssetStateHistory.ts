import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAssetStateHistory1790038679307 implements MigrationInterface {
  name = 'AddAssetStateHistory1790038679307';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."asset_state_history_previous_status_enum" AS ENUM('OPERATIONAL', 'UNDER_MAINTENANCE', 'CRITICAL', 'DECOMMISSIONED')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."asset_state_history_new_status_enum" AS ENUM('OPERATIONAL', 'UNDER_MAINTENANCE', 'CRITICAL', 'DECOMMISSIONED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "asset_state_history" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "asset_id" uuid NOT NULL, "previous_status" "public"."asset_state_history_previous_status_enum" NOT NULL, "new_status" "public"."asset_state_history_new_status_enum" NOT NULL, "changed_at" TIMESTAMP NOT NULL DEFAULT now(), "changed_by_user_id" uuid, "source" character varying NOT NULL, CONSTRAINT "PK_25e80355b6686f605059ad89fb3" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_7ce8be1e8c4121261bd8c3f7c5" ON "asset_state_history"  ("asset_id", "changed_at") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d9499a5d671fcd3057d222ceb9" ON "asset_state_history"  ("asset_id") `,
    );
    await queryRunner.query(
      `ALTER TABLE "asset_state_history" ADD CONSTRAINT "FK_d9499a5d671fcd3057d222ceb9d" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "asset_state_history" ADD CONSTRAINT "FK_bceaea5540e68cffc167c161f1a" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "asset_state_history" DROP CONSTRAINT "FK_bceaea5540e68cffc167c161f1a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "asset_state_history" DROP CONSTRAINT "FK_d9499a5d671fcd3057d222ceb9d"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d9499a5d671fcd3057d222ceb9"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_7ce8be1e8c4121261bd8c3f7c5"`,
    );
    await queryRunner.query(`DROP TABLE "asset_state_history"`);
    await queryRunner.query(
      `DROP TYPE "public"."asset_state_history_new_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."asset_state_history_previous_status_enum"`,
    );
  }
}
