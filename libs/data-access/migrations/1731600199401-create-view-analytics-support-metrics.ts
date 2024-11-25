import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateViewAnalyticsSupportMetrics1731600199401 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      /*
      this view is used to provide basic information around the support metrics, including the:
      - suggestion_time: time when the support was suggested or null if self created (started_at = created_at)
      - started_at: when the organisation picked the support
      - finished_at: when the organisation finished the support or null if still ongoing
      - suggested_at_weekday: the day of the week when the support was suggested (Monday, Tuesday, etc)
      - days_to_support: the number of days from the suggestion to the start of the support
      - workdays_to_support: the number of workdays from the suggestion to the start of the support

      The results are filtered to only include supports created after the deployment of the new supports as previous data
      included supports with negative time from suggestion, issues around state transitions as the support could have been
      engaged more than once, ... This was not only agreed with the client as they mentioned they'd prefer to start from
      scratch and disregard the older data.
      */

      CREATE OR ALTER VIEW analytics_support_metrics_view AS
      SELECT 
      i.id as innovation_id,
      i.name as innovation, 
      o.id as organisation_id,
      o.name as organisation,
      ou.id as organisation_unit_id,
      ou.name as organisation_unit,
      s.id as support_id,
      IIF(s.created_at = s.started_at, s.created_at, null) as suggested_at,
      DATENAME(weekday, IIF(s.created_at = s.started_at, s.created_at, null)) as suggested_at_weekday,
      s.started_at, 
      s.finished_at,
      DATEDIFF(day, s.created_at, COALESCE(started_at, GETDATE())) as days_to_support,
      dbo.workdaysBetween(s.created_at, COALESCE(started_at, GETDATE())) as workdays_to_support
      FROM innovation_support s
      INNER JOIN organisation_unit ou ON s.organisation_unit_id = ou.id
      INNER JOIN organisation o ON o.id = ou.organisation_id
      INNER JOIN innovation i ON i.id = s.innovation_id
      WHERE s.created_at > '2024-11-06 17:00:00' -- date of the deployment of the new supports
      `);
  }
  async down(): Promise<void> {}
}
