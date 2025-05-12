import { type MigrationInterface, type QueryRunner } from 'typeorm';
export class InnovationNeedingAction1747043760032 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR ALTER VIEW innovation_needing_action_view AS
SELECT
    i.id, i.name, combined.org as org_unit_id, combined.[status] as support_status, combined.due_date, combined.due_days
FROM
    innovation i
INNER JOIN (
    SELECT
        last_act_view.innovation_id AS id,
        s.organisation_unit_id as org,
        DATEADD(month, 3, last_update) as due_date,
        DATEDIFF(DAY, DATEADD(month, 3, last_update), GETDATE()) as due_days,
        s.[status]
    FROM
        innovation_support_last_activity_update_view as last_act_view
    INNER JOIN
        innovation_support s ON last_act_view.support_id = s.id AND s.is_most_recent = 1 AND s.deleted_at IS NULL AND s.[status] IN ('ENGAGING', 'WAITING')
    WHERE
        last_act_view.last_update <= DATEADD(day, -30, GETDATE())
    UNION ALL
    SELECT
        innovation_id AS id,
        organisation_unit_id as org,
        dbo.addWorkDays(updated_at, 6) as due_date,
        DATEDIFF(DAY, dbo.addWorkDays(updated_at, 6), GETDATE()) as due_days,
        [status]
    FROM
        innovation_support
    WHERE
        dbo.workdaysBetween(innovation_support.updated_at, GETDATE()) > 3
        AND innovation_support.is_most_recent = 1
        AND innovation_support.status = 'SUGGESTED'
        AND deleted_at IS NULL
) AS combined ON i.id = combined.id
      `);
  }
  async down(): Promise<void> {}
}
