import type { MigrationInterface, QueryRunner } from 'typeorm';

// This view is used retrieve the organisations, units and respective users that are in the followind relational status:
// - ENGANGING
// - WAITING
// - SUGGESTED
// - PREVIOUS_ENGAGED
//
export class createViewInnovationRelevantOrganisationsStatus1726404764186 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    CREATE OR ALTER VIEW [innovation_relevant_organisations_status_view] AS
      WITH engaging_waiting AS (
  SELECT s.innovation_id, s.organisation_unit_id, s.status, s.id as support_id
  FROM innovation_support s
  WHERE s.status IN ('ENGAGING','WAITING')
), previous_engaged AS (
  SELECT s.innovation_id, s.organisation_unit_id, 'PREVIOUS_ENGANGED' as status, null as support_id
  FROM innovation_support FOR SYSTEM_TIME ALL s
  WHERE s.status = 'ENGAGING'
  AND s.organisation_unit_id NOT IN (SELECT organisation_unit_id FROM engaging_waiting WHERE innovation_id = s.innovation_id)
  GROUP BY s.innovation_id, s.organisation_unit_id
), suggested AS (
  SELECT sl.innovation_id, slou.organisation_unit_id, 'SUGGESTED' as status, null as support_id
  FROM innovation_support_log sl
  INNER JOIN innovation_support_log_organisation_unit slou ON sl.id = slou.innovation_support_log_id
  WHERE sl.type IN ('ASSESSMENT_SUGGESTION','ACCESSOR_SUGGESTION')
  AND slou.organisation_unit_id NOT IN (SELECT organisation_unit_id FROM engaging_waiting WHERE innovation_id = sl.innovation_id UNION ALL SELECT organisation_unit_id FROM previous_engaged WHERE innovation_id = sl.innovation_id)
  GROUP BY sl.innovation_id, slou.organisation_unit_id
), all_supports AS (
  SELECT * FROM engaging_waiting
  UNION ALL
  SELECT * FROM previous_engaged
  UNION ALL
  SELECT * FROM suggested
)
SELECT
s.innovation_id,
status,
JSON_OBJECT('id': o.id, 'name': o.name, 'acronym': o.acronym) AS organisation_data,
JSON_OBJECT('id': ou.id, 'name': ou.name, 'acronym': ou.acronym) AS organisation_unit_data,
-- I want the assigned for the engaging/waiting and all the QAs for the other ones
IIF(
  s.support_id IS NULL,
  -- if not support I want all the QAs
  (SELECT DISTINCT id as roleId, user_id as userId FROM user_role WHERE organisation_unit_id = ou.id AND role='QUALIFYING_ACCESSOR' AND is_active = 1 FOR JSON AUTO),
  -- if support I want the assigned
  (SELECT DISTINCT id as roleId, user_id as userId FROM innovation_support_user su
   INNER JOIN user_role r ON su.user_role_id=r.id AND r.is_active = 1 FOR JSON AUTO)
) as user_data
FROM all_supports s
INNER JOIN organisation_unit ou on s.organisation_unit_id = ou.id
INNER JOIN organisation o on ou.organisation_id = o.id
INNER JOIN innovation_share ish ON ish.innovation_id = s.innovation_id AND ish.organisation_id = ou.organisation_id
  `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP VIEW [innovation_relevant_organisations_status_view]');
  }
}
