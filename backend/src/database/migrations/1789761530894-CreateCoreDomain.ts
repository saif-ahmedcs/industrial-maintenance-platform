import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateCoreDomain1789761530894 implements MigrationInterface {
    name = 'CreateCoreDomain1789761530894'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "plants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "address" character varying, CONSTRAINT "PK_7056d6b283b48ee2bb0e53bee60" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "locations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "plant_id" uuid NOT NULL, "name" character varying NOT NULL, "parent_location_id" uuid, CONSTRAINT "PK_7cc1c9e3853b94816c094825e74" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9b50e34275da8cdbeb78fc74b5" ON "locations"  ("plant_id") `);
        await queryRunner.query(`CREATE TYPE "public"."assets_criticality_enum" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')`);
        await queryRunner.query(`CREATE TYPE "public"."assets_status_enum" AS ENUM('OPERATIONAL', 'UNDER_MAINTENANCE', 'CRITICAL', 'DECOMMISSIONED')`);
        await queryRunner.query(`CREATE TABLE "assets" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "asset_type_id" uuid NOT NULL, "location_id" uuid NOT NULL, "tag" character varying NOT NULL, "manufacturer" character varying, "model" character varying, "criticality" "public"."assets_criticality_enum" NOT NULL DEFAULT 'MEDIUM', "status" "public"."assets_status_enum" NOT NULL DEFAULT 'OPERATIONAL', "installed_at" TIMESTAMP, CONSTRAINT "UQ_1ce0bbe0cf890770e37bc03430b" UNIQUE ("tag"), CONSTRAINT "PK_da96729a8b113377cfb6a62439c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_7e9c64cc3c96cc675f293876a1" ON "assets"  ("location_id", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_d43ed9e838f74bcc07b1266a8d" ON "assets"  ("asset_type_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_916f79b60e63293b23def86da6" ON "assets"  ("location_id") `);
        await queryRunner.query(`CREATE TABLE "asset_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "category" character varying, CONSTRAINT "PK_2cf0314bcc4351b7f2827d57edb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "locations" ADD CONSTRAINT "FK_9b50e34275da8cdbeb78fc74b5a" FOREIGN KEY ("plant_id") REFERENCES "plants"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "locations" ADD CONSTRAINT "FK_06f770dfdf4e78f67ad08f80cdc" FOREIGN KEY ("parent_location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assets" ADD CONSTRAINT "FK_d43ed9e838f74bcc07b1266a8d6" FOREIGN KEY ("asset_type_id") REFERENCES "asset_types"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "assets" ADD CONSTRAINT "FK_916f79b60e63293b23def86da6d" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "assets" DROP CONSTRAINT "FK_916f79b60e63293b23def86da6d"`);
        await queryRunner.query(`ALTER TABLE "assets" DROP CONSTRAINT "FK_d43ed9e838f74bcc07b1266a8d6"`);
        await queryRunner.query(`ALTER TABLE "locations" DROP CONSTRAINT "FK_06f770dfdf4e78f67ad08f80cdc"`);
        await queryRunner.query(`ALTER TABLE "locations" DROP CONSTRAINT "FK_9b50e34275da8cdbeb78fc74b5a"`);
        await queryRunner.query(`DROP TABLE "asset_types"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_916f79b60e63293b23def86da6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d43ed9e838f74bcc07b1266a8d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7e9c64cc3c96cc675f293876a1"`);
        await queryRunner.query(`DROP TABLE "assets"`);
        await queryRunner.query(`DROP TYPE "public"."assets_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."assets_criticality_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9b50e34275da8cdbeb78fc74b5"`);
        await queryRunner.query(`DROP TABLE "locations"`);
        await queryRunner.query(`DROP TABLE "plants"`);
    }

}
