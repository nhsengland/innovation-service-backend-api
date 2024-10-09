import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangesToSupportMultipleSupportsPerInnovation1727438455380 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add current major assessment to innovation
    await queryRunner.query(`ALTER TABLE innovation ADD current_major_assessment_id UNIQUEIDENTIFIER`);

    // Set the current major assessment id
    await queryRunner.query(`
      WITH current_major_assessments AS (
        SELECT DISTINCT innovation_id, FIRST_VALUE(id) OVER (PARTITION BY innovation_id ORDER BY created_at DESC) AS assessment_id
        FROM innovation_assessment
        WHERE minor_version = 0
      ) UPDATE innovation
      SET current_major_assessment_id = ma.assessment_id
      FROM innovation i
      INNER JOIN current_major_assessments ma ON i.id = ma.innovation_id
      WHERE i.id = ma.innovation_id;
    `);

    // Changes to support table
    await queryRunner.query(`
      ALTER TABLE innovation_support ADD started_at DATETIME2;
      ALTER TABLE innovation_support ADD finished_at DATETIME2;
      ALTER TABLE innovation_support ADD is_most_recent BIT CONSTRAINT "df_innovation_support_is_most_recent" DEFAULT 1 NOT NULL;
      ALTER TABLE innovation_support ADD major_assessment_id UNIQUEIDENTIFIER CONSTRAINT "df_temp" DEFAULT '00000000-0000-0000-0000-000000000000' NOT NULL; -- Default to empty guid because of system_version
      ALTER TABLE innovation_support ADD close_reason VARCHAR(255);
      ALTER TABLE innovation_support DROP CONSTRAINT CK_innovation_support_archive_snapshot_is_json;
      ALTER TABLE innovation_support DROP COLUMN archive_snapshot;
    `);

    // Update assessment_id with current_assessment_id from innovation table
    await queryRunner.query(`
      UPDATE innovation_support
      SET major_assessment_id = innovation.current_major_assessment_id
      FROM innovation_support
      INNER JOIN innovation ON innovation_support.innovation_id = innovation.id;

       -- Drop the default constraint
      ALTER TABLE innovation_support DROP CONSTRAINT df_temp;
    `);

    // Add columns to innovation_support_log
    await queryRunner.query(`
      ALTER TABLE innovation_support_log ADD major_assessment_id UNIQUEIDENTIFIER;
      ALTER TABLE innovation_support_log ADD context_id UNIQUEIDENTIFIER;
    `);

    // Set the major assessment id
    await queryRunner.query(`
      WITH major_assessments AS (
        SELECT DISTINCT innovation_id, id AS assessment_id, created_at
        FROM innovation_assessment
        WHERE minor_version = 0
      ), support_log_assessment AS (
        SELECT DISTINCT sl.id, sl.created_at, FIRST_VALUE(a.assessment_id) OVER (PARTITION BY sl.innovation_id ORDER BY a.created_at DESC) AS assessment_id
        FROM innovation_support_log sl
        LEFT JOIN major_assessments a ON sl.innovation_id = a.innovation_id AND a.created_at < sl.created_at
      )
      UPDATE innovation_support_log
      SET major_assessment_id = sla.assessment_id
      FROM support_log_assessment sla
      WHERE innovation_support_log.id = sla.id;
    `);

    // Set the support log context id for supports (all except ASSESSMENT suggestion have a support)
    await queryRunner.query(`
      UPDATE innovation_support_log
      SET context_id = s.id
      FROM innovation_support_log sl
      INNER JOIN innovation_support s ON sl.innovation_id = s.innovation_id AND sl.organisation_unit_id = s.organisation_unit_id;
    `);

    // Set the support log context id for assessment suggestions
    await queryRunner.query(`
      WITH assessments AS (
        SELECT DISTINCT innovation_id, id AS assessment_id, created_at
        FROM innovation_assessment
      ), support_log_assessment AS (
        SELECT DISTINCT sl.id, sl.created_at, FIRST_VALUE(a.assessment_id) OVER (PARTITION BY sl.innovation_id ORDER BY a.created_at DESC) AS assessment_id
        FROM innovation_support_log sl
        LEFT JOIN assessments a ON sl.innovation_id = a.innovation_id AND a.created_at < sl.created_at
        WHERE sl.type = 'ASSESSMENT_SUGGESTION'
      )
      UPDATE innovation_support_log
      SET context_id = sla.assessment_id
      FROM support_log_assessment sla
      WHERE innovation_support_log.id = sla.id;
    `);

    // Add foreign keys
    await queryRunner.query(`
      ALTER TABLE innovation ADD CONSTRAINT FK_innovation_current_major_assessment_id FOREIGN KEY (current_major_assessment_id) REFERENCES innovation_assessment(id);
      ALTER TABLE innovation_support ADD CONSTRAINT FK_innovation_support_assessment_id FOREIGN KEY (major_assessment_id) REFERENCES innovation_assessment(id);
      ALTER TABLE innovation_support_log ADD CONSTRAINT FK_innovation_support_log_major_assessment_id FOREIGN KEY (major_assessment_id) REFERENCES innovation_assessment(id);
    `);

    // Fix the support log constraint and make current UNASSIGNED as SUGGESTED
    await queryRunner.query(`
      ALTER TABLE innovation_support DROP CONSTRAINT CK_innovation_support_status;
      ALTER TABLE innovation_support DROP CONSTRAINT df_innovation_support_status;

      UPDATE innovation_support SET [status] = 'SUGGESTED' WHERE [status] = 'UNASSIGNED';

      -- Add status constraint with new statuses
      ALTER TABLE innovation_support ADD CONSTRAINT "CK_innovation_support_status" CHECK( [status] IN ('SUGGESTED', 'ENGAGING', 'WAITING', 'UNSUITABLE', 'CLOSED') );
      ALTER TABLE innovation_support ADD CONSTRAINT "df_innovation_support_status" DEFAULT 'SUGGESTED' FOR [status];
    `);

    // Alter support unique index to exclude closed supports
    await queryRunner.query(`
      DROP INDEX IX_UNIQUE_SUPPORT_UNIT ON innovation_support;
      CREATE UNIQUE NONCLUSTERED INDEX IX_UNIQUE_SUPPORT_UNIT ON innovation_support(innovation_id, organisation_unit_id, deleted_at) WHERE [status] <> 'CLOSED' AND [status] <> 'UNSUITABLE';
    `);

    // Add close reason
    await queryRunner.query(`
      WITH reason AS (
        SELECT s.id, IIF(sh.organisation_id IS NULL, 'STOP_SHARE', IIF(i.status='ARCHIVED', 'ARCHIVE', 'SUPPORT_COMPLETE')) as close_reason
        FROM innovation_support s
        INNER JOIN organisation_unit ou ON s.organisation_unit_id = ou.id
        INNER JOIN innovation i ON i.id = s.innovation_id
        LEFT JOIN innovation_share sh ON sh.innovation_id = s.innovation_id AND ou.organisation_id = sh.organisation_id
        WHERE s.status = 'CLOSED'
      ) UPDATE innovation_support
      SET close_reason = reason.close_reason
      FROM reason
      WHERE innovation_support.id = reason.id;

      UPDATE innovation_support
      SET close_reason = 'SUPPORT_COMPLETE'
      WHERE status='UNSUITABLE';
    `);

    // Add suggested supports
    await queryRunner.query(`
      WITH accessor_suggestions AS (
        SELECT sl.innovation_id, slou.organisation_unit_id, MIN(sl.created_at) AS suggested_on
        FROM innovation_support_log_organisation_unit slou
        INNER JOIN innovation_support_log sl ON slou.innovation_support_log_id = sl.id
        WHERE sl.type='ACCESSOR_SUGGESTION'
        GROUP BY sl.innovation_id, slou.organisation_unit_id
      ), assessment_suggestions AS (
        SELECT i.id AS innovation_id, aou.organisation_unit_id, a.finished_at AS suggested_on
        FROM innovation i
        INNER JOIN innovation_assessment a ON i.current_assessment_id = a.id
        INNER JOIN innovation_assessment_organisation_unit aou ON a.id = aou.innovation_assessment_id
        WHERE a.finished_at IS NOT NULL
      ), all_suggestions AS (
        SELECT innovation_id, organisation_unit_id, MIN(suggested_on) as suggested_on FROM (SELECT * FROM accessor_suggestions
        UNION ALL
        SELECT * FROM assessment_suggestions) t
        GROUP BY innovation_id, organisation_unit_id
      ), supports_to_create AS (
        SELECT sug.*, i.current_major_assessment_id
        FROM all_suggestions sug
        INNER JOIN innovation i ON sug.innovation_id = i.id
        INNER JOIN organisation_unit ou ON sug.organisation_unit_id = ou.id
        INNER JOIN innovation_share sh ON sug.innovation_id = sh.innovation_id  AND sh.organisation_id = ou.organisation_id
        LEFT JOIN innovation_support s ON s.innovation_id = sug.innovation_id AND s.organisation_unit_id = sug.organisation_unit_id
        WHERE s.id IS NULL
        AND i.status='IN_PROGRESS'
      ) INSERT INTO innovation_support (created_at, created_by, updated_at, updated_by, status, innovation_id, organisation_unit_id, major_assessment_id)
      SELECT 
        s.suggested_on, 
        '00000000-0000-0000-0000-000000000000', 
        s.suggested_on, 
        '00000000-0000-0000-0000-000000000000', 
        'SUGGESTED', 
        s.innovation_id, 
        s.organisation_unit_id, 
        s.current_major_assessment_id 
      FROM supports_to_create s
`);
  }

  public async down(): Promise<void> {
    // Destructive migration
  }
}
