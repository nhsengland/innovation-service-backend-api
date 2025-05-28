import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AlterViewAnalyticsOrgsInactivityKPI1747993334165 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
CREATE OR ALTER VIEW analytics_organisation_inactivity_kpi_view AS
WITH breaches AS (
  SELECT DISTINCT 
    YEAR(b.date) as year,
    MONTH(b.date) as month,
    b.innovation_id,
    s.organisation_unit_id
    FROM analytics_organisation_inactivity_breach b
	INNER JOIN innovation_support s ON b.support_id= s.id
) SELECT year, month, o.name AS organisation, o.id AS organisation_id, ou.name AS organisation_unit,ou.id AS organisation_unit_id, b.innovation_id, i.name AS innovation_name
FROM breaches b
INNER JOIN innovation i ON b.innovation_id = i.id
INNER JOIN organisation_unit ou ON b.organisation_unit_id = ou.id
INNER JOIN organisation o ON ou.organisation_id = o.id
      `);
  }
  async down(): Promise<void> {}
}
