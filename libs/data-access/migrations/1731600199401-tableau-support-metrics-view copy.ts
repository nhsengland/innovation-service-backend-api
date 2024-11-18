import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateWorkdaysBetweenFunctoin implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR ALTER VIEW tableau_support_metrics_view AS
      SELECT 
      i.id as innovation_id,
      i.name as innovation, 
      o.id as organisation_id,
      o.name as organisation,
      ou.id as organisation_unit_id,
      ou.name as organisation_unit,
      s.id as support_id,
      IIF(DATEDIFF(MINUTE, s.created_at, s.started_at) < 1, NULL, s.created_at) as suggested_at, 
      s.started_at, 
      s.finished_at,
      DATEDIFF(day, s.created_at, COALESCE(started_at, GETDATE())) as days_to_support,
      workdaysBetween(s.created_at, COALESCE(started_at, GETDATE())) as workdays_to_support
      FROM innovation_support s
      INNER JOIN organisation_unit ou ON s.organisation_unit_id = ou.id
      INNER JOIN organisation o ON o.id = ou.organisation_id
      INNER JOIN innovation i ON i.id = s.innovation_id
      WHERE s.created_at > '2024-11-06 17:00:00' -- date of the deployment of the new supports
      `);
  }
  async down(): Promise<void> {}
}
