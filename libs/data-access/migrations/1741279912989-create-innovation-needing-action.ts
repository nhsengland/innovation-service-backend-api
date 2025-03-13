import { type MigrationInterface, type QueryRunner } from 'typeorm';
export class InnovationNeedingAction1741279912989 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR ALTER VIEW innovation_needing_action_view AS
SELECT
    i.id, i.name, combined.org as org_unit_id, combined.[status] as support_status, MIN(combined.due_date) as due_date, combined.due_days
FROM
    innovation i
INNER JOIN (
    SELECT
        last_act_view.innovation_id AS id,
        organisation_unit_id as org,
        DATEADD(month, 3, last_update) as due_date,
        DATEDIFF(DAY, DATEADD(month, 3, last_update), GETDATE()) as due_days,
        last_act_view_support.[status]
    FROM
        innovation_support_last_activity_update_view as last_act_view
    INNER JOIN (
        SELECT
            innovation_id,
            [status]
        FROM
            innovation_support
        WHERE
            is_most_recent = 1
            AND deleted_at IS NULL
            AND ([status] = 'ENGAGING' OR [status] = 'WAITING')
    ) AS last_act_view_support ON last_act_view.innovation_id = last_act_view_support.innovation_id
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
-- WHERE
    -- combined.org = '7dd3b905-7cb6-ec11-997e-0050f25a43bd'
GROUP BY
    i.id, i.name, combined.org, combined.[status], combined.due_days
      `);
  }
  async down(): Promise<void> {}
}
