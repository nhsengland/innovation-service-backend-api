import type { MigrationInterface, QueryRunner } from 'typeorm';

// This view is used to calculate the KPI for the support team, this can be improved once we don't need to query the
// activity log
export class createViewLastSupportActivityUpdate1699361786862 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    CREATE OR ALTER VIEW [innovation_support_last_activity_update_view] AS
    WITH latest_support_log_update AS (
      SELECT innovation_id, organisation_unit_id, MAX(created_at) as last_update
      FROM innovation_support_log
      WHERE type='PROGRESS_UPDATE'
      GROUP BY innovation_id, organisation_unit_id
    ),
    latest_activity_log_update as (
      SELECT l.innovation_id, r.organisation_unit_id, MAX(l.created_at) as last_update
      FROM activity_log L
      INNER JOIN user_role r ON l.user_role_id=r.id
      GROUP BY L.innovation_id, r.organisation_unit_id
    )
    SELECT 
    s.id as support_id,
    s.innovation_id,
    s.organisation_unit_id,
    CASE
      WHEN ISNULL(l1.last_update, '1900-01-01') >= ISNULL(l2.last_update, '1900-01-01') 
        AND ISNULL(l1.last_update, '1900-01-01') >= s.updated_at THEN l1.last_update
      WHEN ISNULL(l2.last_update, '1900-01-01') >= ISNULL(l1.last_update, '1900-01-01') 
        AND ISNULL(l2.last_update, '1900-01-01') >= s.updated_at THEN l2.last_update
      ELSE s.updated_at
    END AS last_update
    FROM innovation_support s
    INNER JOIN innovation i ON s.innovation_id=i.id AND i.status = 'IN_PROGRESS'
    LEFT JOIN latest_support_log_update l1 on s.innovation_id = l1.innovation_id and s.organisation_unit_id=l1.organisation_unit_id
    LEFT JOIN latest_activity_log_update l2 on s.innovation_id = l2.innovation_id and s.organisation_unit_id=l2.organisation_unit_id
  `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
