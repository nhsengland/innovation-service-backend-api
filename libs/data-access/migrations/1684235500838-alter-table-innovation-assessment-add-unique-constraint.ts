import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableInnovationAssessementAddUniqueConstraint1684235500838 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_innovation_id_deleted_at_null"
      ON innovation_assessment (innovation_id)
      WHERE deleted_at IS NULL;
    `);
  }

  public async down(): Promise<void> {}
}
