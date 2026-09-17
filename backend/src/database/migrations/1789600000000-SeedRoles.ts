import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedRoles1789600000000 implements MigrationInterface {
  name = 'SeedRoles1789600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "roles" ("name") VALUES
        ('ADMIN'), ('SUPERVISOR'), ('TECHNICIAN'), ('VIEWER')
      ON CONFLICT ("name") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "roles" WHERE "name" IN ('ADMIN', 'SUPERVISOR', 'TECHNICIAN', 'VIEWER')
    `);
  }
}
