import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateViewTableauOrgsInactivityKPI1731600199402 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
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
  SELECT e.year, e.month, ou.name,ou.id, e.innovation_id, i.name as innovation_name, IIF(b.id IS NULL, 0, 1) as breached
  FROM engaging_month e
  INNER JOIN innovation i ON e.innovation_id = i.id
  INNER JOIN organisation_unit ou ON e.organisation_unit_id = ou.id
  LEFT JOIN breaches b ON e.id = b.id AND e.[year] = b.[year] AND e.[month] = b.[month]
  ORDER BY year, month, ou.name, i.name
  OPTION (MAXRECURSION 0);


-- Indexes missing
-- activity_log issues for old multiaccount users



      `);
  }
  async down(): Promise<void> {}
}
