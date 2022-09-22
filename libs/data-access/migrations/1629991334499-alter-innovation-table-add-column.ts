import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterInnovationTableAddColumn1629991334499 implements MigrationInterface {

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "innovation" ADD archive_reason nvarchar(max) NULL;`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "innovation" DROP COLUMN "archive_reason"`
    );
  }

}
