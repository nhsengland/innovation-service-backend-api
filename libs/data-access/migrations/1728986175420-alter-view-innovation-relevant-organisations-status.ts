import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AlterViewInnovationRelevantOrganisations1728986175420 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE OR ALTER   VIEW [dbo].[innovation_relevant_organisations_status_view] AS
          WITH engaging_waiting AS (
      SELECT s.innovation_id, s.organisation_unit_id, s.status, s.id as support_id
      FROM innovation_support s
      WHERE s.status IN ('ENGAGING','WAITING')
    ), previous_engaged AS (
      SELECT s.innovation_id, s.organisation_unit_id, 'PREVIOUS_ENGAGED' as status, null as support_id
      FROM innovation_support FOR SYSTEM_TIME ALL s
      WHERE s.status = 'ENGAGING'
      AND s.organisation_unit_id NOT IN (SELECT organisation_unit_id FROM engaging_waiting WHERE innovation_id = s.innovation_id)
      GROUP BY s.innovation_id, s.organisation_unit_id
    ), suggested AS (
        SELECT ins.innovation_id, ins.organisation_unit_id, 'SUGGESTED' as status, null as support_id
        FROM innovation_support ins
        WHERE [status] = 'SUGGESTED'
        AND ins.organisation_unit_id NOT IN (SELECT organisation_unit_id FROM previous_engaged WHERE innovation_id = ins.innovation_id)
        GROUP BY ins.innovation_id, ins.organisation_unit_id
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
      (SELECT id as roleId, user_id as userId FROM user_role WHERE organisation_unit_id = ou.id AND role='QUALIFYING_ACCESSOR' AND is_active = 1 FOR JSON AUTO),
      -- if support I want the assigned
      (SELECT id as roleId, user_id as userId FROM innovation_support_user su
      INNER JOIN user_role r ON su.user_role_id=r.id AND r.is_active = 1 WHERE su.innovation_support_id = s.support_id FOR JSON AUTO)
    ) as user_data
    FROM all_supports s
    INNER JOIN organisation_unit ou on s.organisation_unit_id = ou.id
    INNER JOIN organisation o on ou.organisation_id = o.id
    INNER JOIN innovation_share ish ON ish.innovation_id = s.innovation_id AND ish.organisation_id = ou.organisation_id

`);
  }
  async down(_queryRunner: QueryRunner): Promise<void> {}
}
