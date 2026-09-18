import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAuditLogsImmutabilityTrigger1789700000000 implements MigrationInterface {
  name = 'AddAuditLogsImmutabilityTrigger1789700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION audit_logs_prevent_mutation()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'audit_logs is append-only: % is not permitted', TG_OP;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER audit_logs_immutable
      BEFORE UPDATE OR DELETE ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION audit_logs_prevent_mutation();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS audit_logs_immutable ON audit_logs`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS audit_logs_prevent_mutation()`,
    );
  }
}
