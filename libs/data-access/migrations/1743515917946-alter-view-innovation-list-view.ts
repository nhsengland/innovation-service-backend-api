import { type MigrationInterface, type QueryRunner } from 'typeorm';

// NOTE: If altering this view after the first deployment remember:
// - either replace the date variable with the fixed date of the deployment
// - or if the date is not needed anymore, remove the date variable and the field from the view

export class AlterViewInnovationListView1743515917946 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
       CREATE OR ALTER   VIEW [dbo].[innovation_list_view] AS
    WITH innovations AS (
      SELECT
      i.id,
      i.name,
      i.status,
      u.id as owner_id,
      o.name as owner_company_name,
      i.submitted_at,
      i.updated_at,
      i.status_updated_at,
      i.current_assessment_id,
      i.last_assessment_request_at,
      i.has_been_assessed,
      gs.grouped_status as grouped_status
      FROM innovation i
      INNER JOIN innovation_grouped_status_view_entity gs ON i.id = gs.id
      LEFT JOIN [user] u ON i.owner_id = u.id AND u.status != 'DELETED'
      LEFT JOIN organisation o ON u.id= o.created_by AND o.deleted_at IS NULL AND o.is_shadow = 0
    ),
    documents as (
      SELECT d.id, d.document
      FROM innovation_document d
    ),
    engaging_units as (
      SELECT s.innovation_id, ou.id as unit_id, ou.name, ou.acronym, ou.organisation_id,
      JSON_QUERY('[' + STRING_AGG(CONVERT(VARCHAR(38), QUOTENAME(u.id, '"')), ',') + ']') as assigned_accessors
      FROM organisation_unit ou
      INNER JOIN innovation_support s ON ou.id = s.organisation_unit_id AND s.status='ENGAGING'
      LEFT JOIN innovation_support_user su ON s.id = su.innovation_support_id
      LEFT JOIN user_role r ON r.id = su.user_role_id
      LEFT JOIN [user] u ON r.user_id = u.id AND u.status != 'DELETED'
      WHERE ou.deleted_at IS NULL
      GROUP BY s.innovation_id, ou.id, ou.name, ou.acronym, ou.organisation_id
    ),
    engaging_organisations as (
      SELECT ou.innovation_id, o.id as organisation_id, o.name, o.acronym
      FROM organisation o
      INNER JOIN engaging_units ou ON o.id = ou.organisation_id
      GROUP BY ou.innovation_id, o.id, o.name, o.acronym
    )
    SELECT i.*,
    JSON_VALUE(d.document, '$.INNOVATION_DESCRIPTION.countryName') as country_name,
    JSON_VALUE(d.document, '$.INNOVATION_DESCRIPTION.postcode') as postcode,
    JSON_VALUE(d.document, '$.INNOVATION_DESCRIPTION.mainCategory') as main_category,
    JSON_VALUE(d.document, '$.INNOVATION_DESCRIPTION.otherCategoryDescription') as other_category_description,
    JSON_QUERY(d.document, '$.INNOVATION_DESCRIPTION.categories') as categories,
    JSON_QUERY(d.document, '$.INNOVATION_DESCRIPTION.careSettings') as care_settings,
    JSON_VALUE(d.document, '$.INNOVATION_DESCRIPTION.otherCareSetting') as other_care_setting,
    JSON_QUERY(d.document, '$.INNOVATION_DESCRIPTION.involvedAACProgrammes') as involved_aac_programmes,
    JSON_QUERY(d.document, '$.INNOVATION_DESCRIPTION.areas') as areas,
    JSON_QUERY(d.document, '$.UNDERSTANDING_OF_NEEDS.diseasesConditionsImpact') as diseases_and_conditions,
    JSON_QUERY(d.document, '$.UNDERSTANDING_OF_NEEDS.keyHealthInequalities') as key_health_inequalities,
    (SELECT unit_id as unitId, name, acronym, assigned_accessors as assignedAccessors FROM engaging_units u WHERE u.innovation_id = i.id FOR JSON PATH) as engaging_units,
	  (SELECT organisation_id as organisationId, name, acronym FROM engaging_organisations o WHERE o.innovation_id = i.id FOR JSON PATH) as engaging_organisations
    FROM innovations i
    INNER JOIN documents d ON i.id = d.id
      `);
  }
  async down(_queryRunner: QueryRunner): Promise<void> {}
}
