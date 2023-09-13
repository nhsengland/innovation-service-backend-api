import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableAssessmentAssignToNullable1694612583567 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE innovation_assessment ALTER COLUMN assign_to_id uniqueidentifier NULL`);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
