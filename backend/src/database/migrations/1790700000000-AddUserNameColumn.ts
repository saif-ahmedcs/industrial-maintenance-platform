import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserNameColumn1790700000000 implements MigrationInterface {
  name = 'AddUserNameColumn1790700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" ADD "name" character varying`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "name"`);
  }
}
