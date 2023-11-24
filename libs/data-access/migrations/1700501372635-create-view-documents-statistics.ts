import type { MigrationInterface, QueryRunner } from 'typeorm';

export class createViewDocumentStatistics1700501372635 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR ALTER VIEW documents_statistics_view AS
      WITH files AS (
          SELECT innovation_id, context_type, created_by_user_role_id
          FROM innovation_file
          WHERE deleted_at IS NULL
      ),
      uploaded_by AS (
          SELECT innovation_id, CASE WHEN r.role IN ('ACCESSOR', 'QUALIFYING_ACCESSOR') THEN 'ACCESSOR' ELSE r.role END as role, COUNT(*) as count
          FROM files f
          INNER JOIN user_role r ON r.id = f.created_by_user_role_id
          GROUP BY innovation_id, CASE WHEN r.role IN ('ACCESSOR', 'QUALIFYING_ACCESSOR') THEN 'ACCESSOR' ELSE r.role END
      ),
      location AS (
          SELECT innovation_id, context_type as location, COUNT(*) as count
          FROM files
          GROUP BY innovation_id, context_type
      ),
      uploaded_by_unit as (
          SELECT innovation_id, ou.id as id, ou.acronym as unit, COUNT(*) as count
          FROM files f
          INNER JOIN user_role r ON r.id = f.created_by_user_role_id AND r.role IN ('ACCESSOR', 'QUALIFYING_ACCESSOR')
          INNER JOIN organisation_unit ou ON ou.id = r.organisation_unit_id AND ou.deleted_at IS NULL
          GROUP BY innovation_id, ou.id, ou.acronym
      ),
      innovation AS (
          SELECT DISTINCT innovation_id
          FROM files
      )
      SELECT innovation_id,
      (SELECT role, count FROM uploaded_by WHERE innovation_id = i.innovation_id FOR JSON PATH) as uploaded_by_roles,
      (SELECT location, count FROM location WHERE innovation_id = i.innovation_id FOR JSON PATH) as locations,
      (SELECT id, unit, count FROM uploaded_by_unit WHERE innovation_id = i.innovation_id FOR JSON PATH) as uploaded_by_units
      FROM innovation i
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW documents_statistics_view;`);
  }
}
