import type { MigrationInterface, QueryRunner } from 'typeorm';

export class createInnovationGroupedStatusViewEntity1676569564434 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR ALTER VIEW [innovation_grouped_status_view_entity] AS
      SELECT innovation.id,
          CASE
              WHEN innovation.status IN ('CREATED','PAUSED') THEN 'RECORD_NOT_SHARED'
              WHEN innovation.status = 'NEEDS_ASSESSMENT' THEN 'NEEDS_ASSESSMENT'
              WHEN innovation.status = 'WITHDRAWN' THEN 'WITHDRAWN'
              WHEN innovation.status = 'WAITING_NEEDS_ASSESSMENT' THEN
                  CASE WHEN innovation_reassessment_request.innovation_id IS NULL THEN 'AWAITING_NEEDS_ASSESSMENT' ELSE 'AWAITING_NEEDS_REASSESSMENT' END
              WHEN innovation.status = 'IN_PROGRESS' THEN
                  CASE
                      WHEN innovation_had_support.innovation_id IS NULL THEN 'NO_ACTIVE_SUPPORT' ELSE
                          CASE WHEN innovation_support_engaging.innovation_id IS NULL THEN 'AWAITING_SUPPORT' ELSE 'RECEIVING_SUPPORT' END
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
          WHERE status IN ('ENGAGING','FURTHER_INFO_REQUIRED') AND deleted_at IS NULL
          GROUP BY innovation_id
      ) as innovation_support_engaging ON innovation_support_engaging.innovation_id = innovation.id
      LEFT JOIN (
          SELECT DISTINCT innovation_id
          FROM innovation_support
      ) as innovation_had_support ON innovation_had_support.innovation_id = innovation.id
      WHERE innovation.deleted_at IS NULL OR (innovation.status = 'WITHDRAWN' AND innovation.deleted_at IS NOT NULL);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
			DROP VIEW dbo.[innovation_grouped_status_view_entity]
		`);
  }
}
