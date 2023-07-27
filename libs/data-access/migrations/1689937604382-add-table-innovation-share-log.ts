import type { MigrationInterface, QueryRunner } from 'typeorm';

export class addTableInnovationShareLog1689937604382 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE innovation_share_log (
        "created_at" datetime2 NOT NULL CONSTRAINT "df_innovation_share_log_created_at" DEFAULT getdate(),
        "innovation_id" uniqueidentifier NOT NULL, 
        "organisation_id" uniqueidentifier NOT NULL,
        "operation" nvarchar(30)
      );
    `);

    await queryRunner.query(`
      CREATE TRIGGER tr_innovation_share_log_add ON innovation_share
      AFTER INSERT
      AS
      SET NOCOUNT ON;
      
      INSERT INTO innovation_share_log (innovation_id, organisation_id, operation) 
      SELECT innovation_id, organisation_id, 'ADD' FROM inserted;
    `);

    await queryRunner.query(`
      CREATE TRIGGER tr_innovation_share_log_remove ON innovation_share
      AFTER DELETE
      AS
      SET NOCOUNT ON;

      INSERT INTO innovation_share_log (innovation_id, organisation_id, operation) 
      SELECT innovation_id, organisation_id, 'REMOVE' FROM deleted;
    `);

    // This query will scrap the data from the activity log to populate the innovation_share_log table
    await queryRunner.query(`
      WITH l as (
        SELECT l.id,l.innovation_id,created_at, t.value as name
        FROM activity_log l
        CROSS APPLY openjson(l.param, '$.organisations') as t
        WHERE
        activity='SHARING_PREFERENCES_UPDATE'
      ),
      rawdata as (
      SELECT l.innovation_id,l.name,l.created_at,min(t4.created_at) as startDate,min(t2.created_at) as endDate FROM l
      LEFT JOIN l t2 ON l.innovation_id = t2.innovation_id AND l.name!=t2.name AND t2.created_at > l.created_at
      LEFT JOIN l t3 ON t3.created_at = t2.created_at AND l.name = t3.name and l.innovation_id = t3.innovation_id
      LEFT JOIN l t4 ON l.name = t4.name AND t4.created_at <= l.created_at and l.innovation_id = t4.innovation_id
      WHERE t3.id IS NULL
      GROUP BY l.innovation_id,l.name,l.created_at
      ),
      data as (
      SELECT innovation_id, name, CASE WHEN endDate IS NULL THEN startDate ELSE created_at END as startDate, endDate FROM rawdata
      ),
      o as (
      SELECT id, 
      CASE name
        WHEN 'Scottish Heath Technology Group' THEN 'Scottish Health Technologies Group'
        WHEN 'NOCRI/NIHR' THEN 'No idea'
        WHEN 'National Institute for Health Research' THEN 'National Institute for Health and Care Research'
        WHEN 'Department for International Trade' THEN 'Department for Business and Trade'
        ELSE name
      END as name
      FROM organisation
      ),
      i as (
      SELECT data.startDate as created_at, innovation_id, id as organisation_id, 'ADD' as operation FROM data
      INNER JOIN o ON data.name=o.name
      UNION ALL
      SELECT data.endDate as created_at, innovation_id, id as organisation_id, 'REMOVE' as operation FROM data
      INNER JOIN o on data.name=o.name AND data.endDate IS NOT NULL
      )
      INSERT INTO innovation_share_log 
      SELECT * FROM i;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TRIGGER tr_innovation_share_log_add`);
    await queryRunner.query(`DROP TRIGGER tr_innovation_share_log_remove`);
    await queryRunner.query(`DROP TABLE innovation_share_log`);
  }
}
