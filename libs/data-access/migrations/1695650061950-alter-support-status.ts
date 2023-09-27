import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterSupportStatuses1695650061950 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Missing updating some tables such as innovation_support_log, activity log, ...
    await queryRunner.query(`

      -- Drop status constraint
      ALTER TABLE innovation_support DROP CONSTRAINT CK_innovation_support_status;

      -- Update to new statuses
      UPDATE innovation_support
      SET [status] =
          CASE
              WHEN [status] IN ('FURTHER_INFO_REQUIRED', 'NOT_YET') THEN 'WAITING'
              WHEN [status] = 'COMPLETE' THEN 'CLOSED'
          END
      WHERE [status] IN ('FURTHER_INFO_REQUIRED', 'NOT_YET', 'COMPLETE');

      -- Add status constraint with new statuses
      ALTER TABLE innovation_support ADD CONSTRAINT "CK_innovation_support_status" CHECK( [status] IN ('UNASSIGNED', 'ENGAGING', 'WAITING', 'UNSUITABLE', 'CLOSED') );
      ALTER TABLE innovation_support ADD CONSTRAINT "df_innovation_support_status" DEFAULT 'UNASSIGNED' FOR [status];

      -- Drop unneeded views
      DROP VIEW vw_system_state;
      DROP VIEW vw_system_state_list_A_QA;
      DROP VIEW vw_system_state_organisationlevel;
      DROP VIEW last_support_status_view_entity;

    `);

    await queryRunner.query(`
      -- Update view
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
          FROM innovation_support
      ) as innovation_had_support ON innovation_had_support.innovation_id = innovation.id
      WHERE innovation.deleted_at IS NULL OR (innovation.status = 'WITHDRAWN' AND innovation.deleted_at IS NOT NULL);

    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
