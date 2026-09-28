import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiNoteColumns1790500000000 implements MigrationInterface {
  name = 'AddAiNoteColumns1790500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "work_orders" ADD "ai_note" text`);
    await queryRunner.query(`ALTER TABLE "notifications" ADD "ai_note" text`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "notifications" DROP COLUMN "ai_note"`,
    );
    await queryRunner.query(`ALTER TABLE "work_orders" DROP COLUMN "ai_note"`);
  }
}
