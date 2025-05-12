import type { MigrationInterface, QueryRunner } from 'typeorm';

// This view is used to calculate the KPI for the support team, this can be improved once we don't need to query the
// activity log
export class createViewLastSupportActivityUpdate1728469267102 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    CREATE OR ALTER VIEW [innovation_support_last_activity_update_view] AS
    WITH latest_activity_log_update as (
      SELECT l.innovation_id, r.organisation_unit_id, MAX(l.created_at) as last_update
      FROM activity_log L
      INNER JOIN user_role r ON l.user_role_id=r.id
      GROUP BY L.innovation_id, r.organisation_unit_id
    )
    SELECT 
    s.id as support_id,
    s.innovation_id,
    s.organisation_unit_id,
    IIF(l.last_update > s.updated_at, l.last_update, s.updated_at) as last_update
    FROM innovation_support s
    INNER JOIN innovation i ON s.innovation_id=i.id AND i.status = 'IN_PROGRESS'
    LEFT JOIN latest_activity_log_update l on s.innovation_id = l.innovation_id and s.organisation_unit_id=l.organisation_unit_id
    WHERE s.is_most_recent = 1
  `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
