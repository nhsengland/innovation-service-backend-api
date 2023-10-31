import type { MigrationInterface, QueryRunner } from 'typeorm';

// This view is used to calculate the KPI for the support team, this can be improved once we don't need to query the
// activity log
export class createViewSupportKPI1698162171281 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    CREATE OR ALTER VIEW [innovation_support_kpi_view] AS
    WITH latest_suggested AS (
      SELECT i.name as innovation_name, sl.innovation_id, o.id as organisation_id, o.name as organisation_name, slou.organisation_unit_id, ou.name as organisation_unit_name, MIN(sl.created_at) AS first_suggested 
      FROM innovation_support_log_organisation_unit slou
      INNER JOIN organisation_unit ou ON slou.organisation_unit_id = ou.id AND ou.deleted_at IS NULL AND ou.inactivated_at IS NULL
      INNER JOIN organisation o ON ou.organisation_id = o.id AND o.deleted_at IS NULL AND o.inactivated_at IS NULL
      INNER JOIN innovation_support_log sl ON sl.id = slou.innovation_support_log_id
      INNER JOIN innovation i ON i.id = sl.innovation_id AND i.deleted_at IS NULL AND i.status='IN_PROGRESS'
      INNER JOIN innovation_share sh ON sh.innovation_id = sl.innovation_id AND sh.organisation_id = ou.organisation_id
      LEFT JOIN innovation_support s ON sl.innovation_id=s.innovation_id AND slou.organisation_unit_id=s.organisation_unit_id
      WHERE sl.type IN ('ACCESSOR_SUGGESTION', 'ASSESSMENT_SUGGESTION')
      AND s.id IS NULL
      GROUP BY sl.innovation_id, i.name, o.id, o.name, slou.organisation_unit_id, ou.name
    ),
    latest_suggested_organisation AS (
      SELECT innovation_id, organisation_id, organisation_name
      FROM latest_suggested
      GROUP BY innovation_id, organisation_id, organisation_name
    ),
    shares AS
    (
      SELECT l.id, l.innovation_id, created_at, param
      FROM activity_log l
      WHERE activity='SHARING_PREFERENCES_UPDATE'
    ),
    shares_organisations AS
    (
      SELECT s.id, s.innovation_id, s.created_at, value as organisation FROM shares s
      CROSS APPLY OPENJSON(param, '$.organisations')
      -- not improving performance 
      -- INNER JOIN latest_suggested_organisation ls ON ls.organisation_name=value AND ls.innovation_id=s.innovation_id  -- filter only the suggested_organisations
    ),
    most_recent_not_shared as (
      SELECT lso.innovation_id, lso.organisation_name,MAX(s.created_at) AS latest_unshared
      FROM latest_suggested_organisation lso
      INNER JOIN shares s ON lso.innovation_id = s.innovation_id
      LEFT JOIN shares_organisations so ON so.id = s.id AND so.organisation = lso.organisation_name
      WHERE so.organisation IS NULL
      GROUP BY lso.innovation_id, lso.organisation_name
    ),
    latest_start_share as (
      SELECT lso.innovation_id, lso.organisation_id, MIN(s.created_at) AS start_share,
      lso.organisation_name --debug only
      FROM latest_suggested_organisation lso
      LEFT JOIN most_recent_not_shared mr ON mr.innovation_id = lso.innovation_id AND mr.organisation_name = lso.organisation_name
      LEFT JOIN shares s on lso.innovation_id = s.innovation_id AND (mr.latest_unshared IS NULL OR s.created_at > mr.latest_unshared)
      GROUP BY lso.innovation_id, lso.organisation_id, lso.organisation_name
    ),
    unit_kpi_date as (
      SELECT ls.innovation_name, ls.innovation_id, ls.organisation_unit_id, ls.organisation_unit_name,
      CASE 
        WHEN lss.start_share IS NULL THEN ls.first_suggested 
        WHEN lss.start_share > ls.first_suggested THEN lss.start_share
        ELSE ls.first_suggested
      END as assigned_date
      FROM latest_suggested ls
      INNER JOIN latest_start_share lss ON ls.innovation_id = lss.innovation_id AND ls.organisation_id = lss.organisation_id
    )
    SELECT * from unit_kpi_date k
  `);

    await queryRunner.query(`
    CREATE NONCLUSTERED INDEX idx_activity_log_activity_innovation_id_created_at
      ON [dbo].[activity_log] ([activity],[innovation_id])
      INCLUDE ([created_at]);

    CREATE NONCLUSTERED INDEX idx_innovation_support_log_type_innovation_id_created_at
      ON [dbo].[innovation_support_log] ([type],[innovation_id])
      INCLUDE ([created_at]);
    `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
