import type { MigrationInterface, QueryRunner } from 'typeorm';

export class addVersioningToAssessments1722419269520 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create versioning columns
    await queryRunner.query(`
      ALTER TABLE innovation_assessment ADD [major_version] smallint NOT NULL CONSTRAINT DF_innovation_assessment_major_version DEFAULT 0;
      ALTER TABLE innovation_assessment ADD [minor_version] smallint NOT NULL CONSTRAINT DF_innovation_assessment_minor_version DEFAULT 0;
    `);

    // Populate versioning columns
    await queryRunner.query(`
      -- Declare variables to keep track of versions
      DECLARE @current_innovation_id UNIQUEIDENTIFIER = '00000000-0000-0000-0101-000000000000';
      DECLARE @major_version INT = 0;
      DECLARE @minor_version INT = 0;

      -- Variables to hold cursor info
      DECLARE @id UNIQUEIDENTIFIER;
      DECLARE @innovation_id UNIQUEIDENTIFIER;

      DECLARE assessment_cursor CURSOR FOR
      SELECT id, innovation_id
      FROM innovation_assessment
      ORDER BY innovation_id, created_at;

      OPEN assessment_cursor;

      FETCH NEXT FROM assessment_cursor INTO @id, @innovation_id;

      -- Loop over the cursor
      WHILE @@FETCH_STATUS = 0
      BEGIN
          -- Check if we are still on the same innovation_id
          IF @current_innovation_id != @innovation_id
          BEGIN
              -- Reset versions and current innovation id
              SET @current_innovation_id = @innovation_id;
              SET @major_version = 1;
              SET @minor_version = 0;
          END

          -- Update the table with the new versions
          UPDATE innovation_assessment
          SET "major_version" = @major_version, "minor_version" = @minor_version
          WHERE id = @id;

          -- Increment major version
          SET @major_version = @major_version + 1;

          -- Fetch the next row
          FETCH NEXT FROM assessment_cursor INTO @id, @innovation_id;
      END

      CLOSE assessment_cursor;
      DEALLOCATE assessment_cursor;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE innovation_assessment SET (SYSTEM_VERSIONING = OFF);
      ALTER TABLE innovation_assessment DROP CONSTRAINT DF_innovation_assessment_major_version;
      ALTER TABLE innovation_assessment DROP CONSTRAINT DF_innovation_assessment_minor_version;
      ALTER TABLE innovation_assessment DROP COLUMN [major_version];
      ALTER TABLE innovation_assessment DROP COLUMN [minor_version];
      ALTER TABLE innovation_assessment_history DROP COLUMN [major_version];
      ALTER TABLE innovation_assessment_history DROP COLUMN [minor_version];
      ALTER TABLE innovation_assessment SET (SYSTEM_VERSIONING = ON (HISTORY_TABLE = [dbo].[innovation_assessment_history]));
    `);
  }
}
