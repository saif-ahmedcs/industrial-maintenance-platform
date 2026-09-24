import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTelemetryReadings1790218243390 implements MigrationInterface {
  name = 'CreateTelemetryReadings1790218243390';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "telemetry_readings" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "asset_id" uuid NOT NULL, "temperature" numeric(8,2) NOT NULL, "vibration" numeric(8,2) NOT NULL, "pressure" numeric(8,2) NOT NULL, "recorded_at" TIMESTAMP WITH TIME ZONE NOT NULL, "ingested_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_3c576a1d50104b70a55fb0025ad" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_0165e1ab2be81627fb990682ca" ON "telemetry_readings"  ("asset_id", "recorded_at") `,
    );
    await queryRunner.query(
      `ALTER TABLE "telemetry_readings" ADD CONSTRAINT "FK_2c506f6e0199b27614e95440583" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "telemetry_readings" DROP CONSTRAINT "FK_2c506f6e0199b27614e95440583"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_0165e1ab2be81627fb990682ca"`,
    );
    await queryRunner.query(`DROP TABLE "telemetry_readings"`);
  }
}
