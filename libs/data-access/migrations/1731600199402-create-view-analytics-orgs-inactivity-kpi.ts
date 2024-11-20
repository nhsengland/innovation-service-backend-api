import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateViewAnalyticsOrgsInactivityKPI1731600199402 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    /*
    This is a very specific view to provide the data for the Tableau dashboard around the organisations 3 months 
    inactivity KPI.

    The query is a bit heavy (10-15 sec) in production and we might need to change this to a persisted table in the future

    This view does:
    - Get the days of activities from the activity_log table per organisation unit and innovation
    - Get support engagements (ENGAGING and WAITING) per organisation unit and innovation
    - For the engagments get the days they were engaged and year-month
    - Get the breaches where there are no activities in the last 3 months for each of those days
    - Join the breaches with the engaging days to get the breached flag for each month organisation unit and innovation

    In order to consume the view we need to set the OPTION (MAXRECURSION 0) as the recursion limit in MSSQL is 100 and the supports
    might have been ongoing for a long time.

    Fields: breached (0 or 1), year, month, organisation, organisation_id, organisation_unit, organisation_unit_id, innovation_id, innovation_name

    Example:
    SELECT * FROM analytics_organisation_inactivity_kpi_view
    ORDER BY year, month, organisation_unit, innovation_name
    OPTION (MAXRECURSION 0);  -- default MSSQL recursion limit is 100 which is not enough as the supports might have been ongoing for a long time

    */
    await queryRunner.query(`
CREATE OR ALTER VIEW analytics_organisation_inactivity_kpi_view AS
WITH activities AS (
  -- activities are anything where the organisation writes in the log (messages, progress updates, tasks, support status changes) which usually
  -- trigger a notification to the user. This makes this future proof to anything that writes on the activity_log which encompasses the current
  -- communications
  SELECT DISTINCT CONVERT(DATE, l.created_at) as created_at, l.innovation_id, r.organisation_unit_id FROM activity_log l
  INNER JOIN user_role r ON l.user_role_id = r.id
  WHERE r.organisation_unit_id IS NOT NULL
), engaging AS (
  SELECT id, innovation_id, organisation_unit_id, valid_from as started_at, IIF(valid_to>GETDATE(), GETDATE(), valid_to) as finished_at
  FROM innovation_support FOR SYSTEM_TIME ALL s
  WHERE status IN ('ENGAGING', 'WAITING') -- KPI affects both these states without communication
), engaging_days AS (
  SELECT 
    id,
    innovation_id,
    organisation_unit_id,
    started_at,
    CONVERT(DATE, started_at) as date
    FROM engaging
  UNION ALL
  SELECT 
    engaging.id,
    engaging.innovation_id,
    engaging.organisation_unit_id,
    engaging.started_at,
    DATEADD(day, 1, date)
    FROM engaging_days
    INNER JOIN engaging ON engaging_days.id=engaging.id AND engaging_days.started_at = engaging.started_at
    WHERE DATEADD(day, 1, date) <= finished_at
), breaches AS (
  SELECT DISTINCT 
    YEAR(e.[date]) as year,
    MONTH(e.[date]) as month, 
    e.id
    FROM engaging_days e
    WHERE NOT EXISTS(SELECT TOP 1 1 FROM activities a WHERE a.innovation_id=e.innovation_id AND a.organisation_unit_id=e.organisation_unit_id AND created_at BETWEEN DATEADD(MONTH, -3, date) AND date)
), engaging_month AS (
  SELECT DISTINCT 
    YEAR(e.date) as year,
    MONTH(e.date) as month,
    e.id,
    e.innovation_id,
    e.organisation_unit_id
    FROM engaging_days e
) 
  SELECT e.year, e.month, o.name AS organisation, o.id AS organisation_id, ou.name AS organisation_unit,ou.id AS organisation_unit_id, e.innovation_id, i.name AS innovation_name, IIF(b.id IS NULL, 0, 1) AS breached
  FROM engaging_month e
  INNER JOIN innovation i ON e.innovation_id = i.id
  INNER JOIN organisation_unit ou ON e.organisation_unit_id = ou.id
  INNER JOIN organisation o ON ou.organisation_id = o.id
  LEFT JOIN breaches b ON e.id = b.id AND e.[year] = b.[year] AND e.[month] = b.[month]
      `);
  }
  async down(): Promise<void> {}
}
