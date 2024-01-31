import type { MigrationInterface, QueryRunner } from 'typeorm';

export class migratePausedStatusToArchived1706720380014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- Change all support status from paused innovations to closed and update the archive_snapshot
      UPDATE innovation_support
          SET status = 'CLOSED', archive_snapshot = JSON_MODIFY(
          JSON_MODIFY(
              JSON_MODIFY(
                  COALESCE(archive_snapshot, '{}'),
                  '$.archivedAt', CONVERT(VARCHAR, i.status_updated_at)
              ),
              '$.roles', JSON_QUERY('[]')
          ),
          '$.status', (
              CASE
                  WHEN s.status = 'UNASSIGNED' THEN 'ENGAGING'
                  ELSE s.status
              END
              )
          )
          FROM innovation_support s
          INNER JOIN innovation i ON i.id = s.innovation_id
          WHERE i.status = 'PAUSED' AND s.[status] != 'CLOSED';

      -- Update all paused innovations to archived
      UPDATE innovation
          SET status = 'ARCHIVED'
          WHERE status = 'PAUSED';

      -- Remove PAUSED from the innovation status constraint
      ALTER TABLE "innovation" DROP CONSTRAINT "CK_innovation_status";
      ALTER TABLE "innovation" ADD CONSTRAINT "CK_innovation_status" CHECK ([status] IN (
          'CREATED',
          'WAITING_NEEDS_ASSESSMENT',
          'NEEDS_ASSESSMENT',
          'IN_PROGRESS',
          'WITHDRAWN',
          'COMPLETE',
          'ARCHIVED'
      ));
    `);

    // Remove PAUSED status and add ARCHIVED
    await queryRunner.query(`
    CREATE OR ALTER VIEW [innovation_grouped_status_view_entity] AS
      SELECT innovation.id,
          CASE
              WHEN innovation.status IN ('CREATED') THEN 'RECORD_NOT_SHARED' -- Removed Paused
              WHEN innovation.status = 'NEEDS_ASSESSMENT' THEN 'NEEDS_ASSESSMENT'
              WHEN innovation.status = 'WITHDRAWN' THEN 'WITHDRAWN'
              WHEN innovation.status = 'ARCHIVED' THEN 'ARCHIVED' -- Added
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
      ) as innovation_had_support ON innovation_had_support.innovation_id = innovation.id;
    `);
  }

  public async down(): Promise<void> {}
}
