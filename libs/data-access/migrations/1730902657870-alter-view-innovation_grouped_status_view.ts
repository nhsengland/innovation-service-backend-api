import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AlterViewInnovationGroupedStatusView1730902657870 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR ALTER VIEW [innovation_grouped_status_view_entity] AS
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
            END as grouped_status
        FROM innovation
        LEFT JOIN (
            SELECT innovation_id
            FROM innovation_reassessment_request
            WHERE deleted_at IS NULL
            GROUP BY innovation_id
        ) as innovation_reassessment_request ON innovation_reassessment_request.innovation_id = innovation.id
        LEFT JOIN (
            SELECT innovation_id
            FROM innovation_support
            WHERE status = 'ENGAGING' AND deleted_at IS NULL
            GROUP BY innovation_id
        ) as innovation_support_engaging ON innovation_support_engaging.innovation_id = innovation.id
        LEFT JOIN (
            SELECT DISTINCT innovation_id
            FROM innovation_support s
            -- Added inner join to filter by the current major assessment and exclude suggested
            INNER JOIN innovation i ON s.innovation_id=i.id
		        WHERE s.major_assessment_id = i.current_major_assessment_id AND s.status != 'SUGGESTED'
        ) as innovation_had_support ON innovation_had_support.innovation_id = innovation.id;
      `);
  }
  async down(_queryRunner: QueryRunner): Promise<void> {}
}
