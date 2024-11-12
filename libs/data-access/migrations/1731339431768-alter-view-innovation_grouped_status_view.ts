import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AlterViewInnovationGroupedStatusView1731339431768 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
       ALTER   VIEW [dbo].[innovation_grouped_status_view_entity] AS
        WITH x AS (
            SELECT innovation.id,
                    CASE
                        WHEN innovation.status = 'CREATED' THEN 'RECORD_NOT_SHARED'
                        WHEN innovation.status = 'NEEDS_ASSESSMENT' THEN 'NEEDS_ASSESSMENT'
                        WHEN innovation.status = 'WITHDRAWN' THEN 'WITHDRAWN'
                        WHEN innovation.status = 'ARCHIVED' THEN 'ARCHIVED'
                        WHEN innovation.status = 'WAITING_NEEDS_ASSESSMENT' THEN
                            CASE WHEN innovation_reassessment_request.innovation_id IS NULL THEN 'AWAITING_NEEDS_ASSESSMENT' ELSE 'AWAITING_NEEDS_REASSESSMENT' END
                        WHEN innovation.status = 'IN_PROGRESS' THEN
                            CASE
                                WHEN innovation_had_support.innovation_id IS NULL THEN 'AWAITING_SUPPORT' ELSE
                                    CASE WHEN innovation_support_engaging.innovation_id IS NULL THEN 'NO_ACTIVE_SUPPORT' ELSE 'RECEIVING_SUPPORT' END
                            END
                    END as grouped_status,
                    name,
                    created_by
                    -- days_since_last_support,
                    -- expected_archive_date
                FROM innovation
                LEFT JOIN (
                    SELECT innovation_id
                    FROM innovation_reassessment_request
                    WHERE deleted_at IS NULL
                    GROUP BY innovation_id
                ) as innovation_reassessment_request ON innovation_reassessment_request.innovation_id = innovation.id
                LEFT JOIN (
                    SELECT innovation_id
                    FROM innovation_support s
              INNER JOIN innovation i ON s.innovation_id = i.id AND i.current_major_assessment_id = s.major_assessment_id AND s.is_most_recent = 1
                    WHERE s.status = 'ENGAGING' AND s.deleted_at IS NULL
                    GROUP BY innovation_id
                ) as innovation_support_engaging ON innovation_support_engaging.innovation_id = innovation.id
            LEFT JOIN (
                    SELECT DISTINCT innovation_id
                    FROM innovation_support s
                    -- Added inner join to filter by the current major assessment and exclude suggested
                    INNER JOIN innovation i ON s.innovation_id=i.id
                    WHERE s.major_assessment_id = i.current_major_assessment_id AND s.status != 'SUGGESTED'
                ) as innovation_had_support ON innovation_had_support.innovation_id = innovation.id
        ), y AS (
          SELECT s.innovation_id as id, MAX(finished_at) as finished_at FROM innovation_support s
          INNER JOIN x ON x.grouped_status = 'NO_ACTIVE_SUPPORT' AND s.innovation_id = x.id
          GROUP BY s.innovation_id
        ) SELECT
          x.*,
          DATEDIFF(DAY, y.finished_at, GETDATE()) as days_since_last_support,
          IIF(y.finished_at IS NULL, NULL, DATEADD(MONTH, 6, IIF(y.finished_at>'2025-01-01', y.finished_at, '2025-01-01'))) as expected_archive_date
          FROM x
          LEFT JOIN y ON x.id = y.id;
      `);
  }
  async down(_queryRunner: QueryRunner): Promise<void> {}
}
