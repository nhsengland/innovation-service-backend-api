import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterUserTableAddColumn1632494421632 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD delete_reason nvarchar(max) NULL;`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "delete_reason"`);
  }
}
