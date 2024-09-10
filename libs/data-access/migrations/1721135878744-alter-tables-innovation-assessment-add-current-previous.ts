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
        WHERE innovation_id IN (select innovation_id from innovation_reassessment_request);
    `);

    // Fix for deleted_at that assessment that were duplicated (one case in production but safe since there wasn't a
    // reassessment request, but there is one case in dev so here just in case)
    await queryRunner.query(`
      WITH bad_assessments AS (
        SELECT a.innovation_id, MAX(a.updated_at) AS updated_at
        FROM innovation_assessment a
        LEFT JOIN innovation_reassessment_request r ON a.id = r.innovation_assessment_id
        WHERE r.id IS NULL AND a.deleted_at IS NOT NULL
        GROUP BY a.innovation_id
        HAVING COUNT(*) > 1
      ) UPDATE innovation_assessment
      SET deleted_at = GETDATE()
      FROM innovation_assessment a
      INNER JOIN bad_assessments b ON a.innovation_id = b.innovation_id
      LEFT JOIN innovation_reassessment_request r ON a.id = r.innovation_assessment_id
      WHERE r.id IS NULL AND a.updated_at < b.updated_at;
    `);

    // Set the current assessment id
    await queryRunner.query(`
      UPDATE innovation SET current_assessment_id = t2.id
      FROM innovation i
      INNER JOIN (
        SELECT a.innovation_id, id
        FROM innovation_assessment a
        INNER JOIN  (
          SELECT innovation_id, MAX(created_at) as created_at
          FROM innovation_assessment
          WHERE deleted_at IS NULL
          GROUP by innovation_id) t on t.innovation_id = a.innovation_id AND t.created_at = a.created_at
      ) t2 ON i.id = t2.innovation_id;
    `);

    // Set the previous assessment id
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
