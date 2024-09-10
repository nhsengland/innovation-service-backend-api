import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableInnovationAssessmentAddStartedDate1721919507973 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "innovation_assessment" ADD started_at datetime2;`);

    // We don't have the real started date for older assessments in the case of a reassessment
    await queryRunner.query(`UPDATE innovation_assessment SET started_at = created_at;`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "innovation_assessment" DROP COLUM started_at;
    `);
  }
}
