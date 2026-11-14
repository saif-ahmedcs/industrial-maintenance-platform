import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTelemetryRecordedAtIndex1790900000000 implements MigrationInterface {
  name = 'AddTelemetryRecordedAtIndex1790900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX "IDX_telemetry_readings_recorded_at"
      ON "telemetry_readings" ("recorded_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_telemetry_readings_recorded_at"`,
    );
  }
}
