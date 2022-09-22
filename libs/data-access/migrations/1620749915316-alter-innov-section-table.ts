import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterInnovSectionTable1620749915316 implements MigrationInterface {

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "innovation_section" ADD submitted_at datetime2`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "innovation_section" DROP COLUMN submitted_at`
    );
  }

}
