import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableInnovationAssessmentAddCurrentPrevious1721135878744 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "innovation" ADD current_assessment_id uniqueidentifier;
      ALTER TABLE "innovation_assessment" ADD previous_assessment_id uniqueidentifier;
      
      DROP INDEX "idx_innovation_id_deleted_at_null" ON "innovation_assessment";
      
      -- Recover only the assessments that are related to reassessment requests
      -- at least in production once there was an assessment that got deleted because it was created duplicate
      UPDATE innovation_assessment SET DELETED_AT=NULL
        WHERE id IN (select innovation_assessment_id from innovation_reassessment_request);
    `);

    await queryRunner.query(`
      WITH previous AS (
        SELECT innovation_id, id, created_at,
        LAG(id) OVER (PARTITION BY innovation_id ORDER BY created_at ASC) AS previous_assessment_id
        FROM innovation_assessment
        WHERE deleted_at IS NULL
      ) UPDATE innovation_assessment
      SET previous_assessment_id = p.previous_assessment_id
      FROM innovation_assessment a
      INNER JOIN previous p ON a.id = p.id
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "innovation" DROP COLUMN current_assessment_id;
      ALTER TABLE "innovation_assessment" DROP COLUMN previous_assessment_id;

      UPDATE innovation_assessment SET DELETED_AT=GETDATE()
        WHERE id IN (select innovation_assessment_id from innovation_reassessment_request);
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_innovation_id_deleted_at_null"
      ON innovation_assessment (innovation_id)
      WHERE deleted_at IS NULL;
    `);
  }
}
