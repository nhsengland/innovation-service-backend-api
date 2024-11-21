import { type MigrationInterface, type QueryRunner } from 'typeorm';

// NOTE: If altering this view after the first deployment remember:
// - either replace the date variable with the fixed date of the deployment
// - or if the date is not needed anymore, remove the date variable and the field from the view

export class AlterViewInnovationGroupedStatusView1731339431769 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const date = new Date().toISOString().slice(0, 10);

    await queryRunner.query(`
       CREATE OR ALTER VIEW [dbo].[innovation_grouped_status_view_entity] AS
        WITH innovations AS (
            SELECT i.id, i.status, 
            i.name,
            i.created_by,
            i.current_major_assessment_id, 
            a.major_version
            FROM innovation i
            LEFT JOIN innovation_assessment a ON i.current_assessment_id = a.id
            WHERE i.deleted_at IS NULL
        ), engaging AS (
            SELECT DISTINCT s.innovation_id
            FROM innovation_support s
            INNER JOIN innovations i ON i.id = s.innovation_id AND i.current_major_assessment_id = s.major_assessment_id
            WHERE s.deleted_at IS NULL AND s.status IN ('ENGAGING', 'WAITING')
        ), closed AS (
            SELECT s.innovation_id, MAX(s.finished_at) as finished_at
            FROM innovation_support s
            INNER JOIN innovations i ON i.id = s.innovation_id AND i.current_major_assessment_id = s.major_assessment_id AND i.status='IN_PROGRESS'
            WHERE s.deleted_at IS NULL AND s.status IN ('CLOSED', 'UNSUITABLE')
            GROUP by s.innovation_id
        ) SELECT
            i.id,
            i.name,
            i.created_by,
            CASE
                WHEN i.status = 'CREATED' THEN 'RECORD_NOT_SHARED'
                WHEN i.status = 'NEEDS_ASSESSMENT' THEN 'NEEDS_ASSESSMENT'
                WHEN i.status = 'WITHDRAWN' THEN 'WITHDRAWN'
                WHEN i.status = 'ARCHIVED' THEN 'ARCHIVED'
                WHEN i.status = 'WAITING_NEEDS_ASSESSMENT' THEN IIF(i.major_version > 1, 'AWAITING_NEEDS_REASSESSMENT', 'AWAITING_NEEDS_ASSESSMENT')
                WHEN i.status = 'IN_PROGRESS' THEN
                    CASE
                        WHEN e.innovation_id IS NOT NULL THEN 'RECEIVING_SUPPORT'
                        WHEN c.innovation_id IS NOT NULL THEN 'NO_ACTIVE_SUPPORT'
                        ELSE 'AWAITING_SUPPORT'
                    END
            END as grouped_status,
            DATEDIFF(DAY, c.finished_at, GETDATE()) as days_since_no_active_support,
            IIF(c.finished_at IS NULL, NULL, DATEDIFF(DAY, IIF(c.finished_at>'${date}', c.finished_at, '${date}'), GETDATE())) as days_since_no_active_support_or_deploy,
            IIF(c.finished_at IS NULL, NULL, DATEADD(MONTH, 6, IIF(c.finished_at>'${date}', c.finished_at, '${date}'))) as expected_archive_date
        FROM innovations i
        LEFT JOIN engaging e ON i.id = e.innovation_id
        LEFT JOIN closed c ON i.id = c.innovation_id;
      `);
  }
  async down(_queryRunner: QueryRunner): Promise<void> {}
}
