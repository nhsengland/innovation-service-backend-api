import type { MigrationInterface, QueryRunner } from 'typeorm';

export class createViewDocumentStatistics1700501372635 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    CREATE OR ALTER VIEW innovation_list_view AS
    WITH innovations AS (
      SELECT 
      i.id,
      i.name,
      i.owner_id, -- maybe external
      i.submitted_at,
      i.updated_at,
      i.status
      FROM innovation i
    ),
    documents as (
      SELECT d.id, d.document
      FROM innovation_document d
    ),
    engaging_units as (
      SELECT s.innovation_id, ou.id as unit_id, ou.name, ou.acronym
      FROM organisation_unit ou
      INNER JOIN innovation_support s ON ou.id = s.organisation_unit_id AND s.status='ENGAGING'
      WHERE ou.deleted_at IS NULL
    ),
    innovation_suggestions as (
      SELECT innovation_id, organisation_unit_id as unit_id, ou.name, ou.acronym FROM (
        SELECT innovation_id, aou.organisation_unit_id FROM innovation_assessment_organisation_unit aou
        INNER JOIN innovation_assessment a ON a.id = aou.innovation_assessment_id
        WHERE a.deleted_at IS NULL
        UNION ALL
        SELECT innovation_id, slou.organisation_unit_id FROM innovation_support_log_organisation_unit slou
        INNER JOIN innovation_support_log sl ON slou.innovation_support_log_id=sl.id
        ) t
      INNER JOIN organisation_unit ou ON t.organisation_unit_id = ou.id AND ou.deleted_at IS NULL
      GROUP BY innovation_id, organisation_unit_id, ou.name, ou.acronym
    )
    SELECT i.*,
    JSON_VALUE(d.document, '$.INNOVATION_DESCRIPTION.countryName') as country_name,
    JSON_VALUE(d.document, '$.INNOVATION_DESCRIPTION.mainCategory') as main_category,
    JSON_QUERY(d.document, '$.INNOVATION_DESCRIPTION.categories') as categories,
    JSON_QUERY(d.document, '$.INNOVATION_DESCRIPTION.careSettings') as care_settings,
    JSON_QUERY(d.document, '$.INNOVATION_DESCRIPTION.involvedAACProgrammes') as involved_aac_programmes,
    JSON_QUERY(d.document, '$.UNDERSTANDING_OF_NEEDS.diseasesConditionsImpact') as diseases_and_conditions,
    JSON_QUERY(d.document, '$.UNDERSTANDING_OF_NEEDS.keyHealthInequalities') as key_health_inequalities,
    (SELECT unit_id, name, acronym FROM engaging_units s WHERE s.innovation_id = i.id FOR JSON PATH) as engaging_units,
    (SELECT unit_id, name, acronym FROM innovation_suggestions s WHERE s.innovation_id = i.id FOR JSON PATH) as suggested_units
    -- conditional s.status as support_status,
    -- conditional s.updated_at as support_updatedAt
    FROM innovations i
    INNER JOIN documents d ON i.id = d.id
    LEFT JOIN engaging_units eu ON eu.innovation_id = i.id
    -- conditional LEFT JOIN innovation_support s ON s.innovation_id = i.id AND s.organisation_unit_id = '982AB20B-7CB6-EC11-997E-0050F25A43BD' -- conditional for OUs
    --WHERE
    --1=1
    -- AND EXISTS(SELECT 1 FROM engaging_units WHERE innovation_id = x.id AND unit_id in ('982AB20B-7CB6-EC11-997E-0050F25A43BD'))
    --AND EXISTS(SELECT 1 FROM innovation_suggestions WHERE innovation_id = x.id AND unit_id in ('982AB20B-7CB6-EC11-997E-0050F25A43BD'))    
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW innovation_list_view;`);
  }
}
