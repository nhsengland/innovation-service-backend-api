import type { MigrationInterface, QueryRunner } from 'typeorm';

export class createInnovationSuggestedUnitsView1713262730895 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR ALTER VIEW innovation_suggested_units_view AS
      SELECT innovation_id,
          suggested_unit_id,
          JSON_QUERY('[' + STRING_AGG(QUOTENAME(suggested_by_acronym, '"'), ',') + ']') as suggested_by_units_acronyms,
          MIN(suggested_on) as suggested_on
      FROM (
          SELECT
              isl.innovation_id,
              COALESCE(suggestedByUnit.id, '00000000-0000-0000-0001-000000000001') as suggested_by_id,
              COALESCE(suggestedByUnit.acronym, 'Needs assessment') as suggested_by_acronym,
              islou.organisation_unit_id as suggested_unit_id,
              CASE WHEN isl.[type] = 'ASSESSMENT_SUGGESTION' THEN max(isl.created_at) ELSE min(isl.created_at) END as suggested_on
          FROM innovation_support_log isl
          INNER JOIN innovation_support_log_organisation_unit islou ON islou.innovation_support_log_id = isl.id
          LEFT JOIN organisation_unit suggestedByUnit ON suggestedByUnit.id = isl.organisation_unit_id
          LEFT JOIN innovation_assessment a ON a.innovation_id = isl.innovation_id AND a.deleted_at IS NULL
          LEFT JOIN innovation_assessment_organisation_unit aou ON aou.innovation_assessment_id = a.id AND aou.organisation_unit_id = islou.organisation_unit_id
          WHERE
              ((isl.type = 'ASSESSMENT_SUGGESTION' AND aou.organisation_unit_id IS NOT NULL) OR (isl.type = 'ACCESSOR_SUGGESTION'))
          GROUP BY isl.innovation_id, suggestedByUnit.id, suggestedByUnit.acronym, islou.organisation_unit_id, isl.type
      ) as suggestions
      GROUP BY innovation_id, suggested_unit_id
    `);
  }

  public async down(): Promise<void> {}
}
