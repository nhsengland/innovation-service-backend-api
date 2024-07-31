import type { MigrationInterface, QueryRunner } from 'typeorm';

export class removeNaCreatedReAssessments1722417284459 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- Turn OFF history from assessment table
      ALTER TABLE innovation_assessment SET (SYSTEM_VERSIONING = OFF)

      -- Variables to save the current ids
      DECLARE @reassessment_id  UNIQUEIDENTIFIER;
      DECLARE @assessment_id UNIQUEIDENTIFIER;
      DECLARE @innovation_id UNIQUEIDENTIFIER;

      DECLARE reassessment_cursor CURSOR FOR
      SELECT id as reasessment_id, innovation_assessment_id as assessment_id, innovation_id as innovation_id
      FROM innovation_reassessment_request
      WHERE updated_innovation_record IS NULL -- The ones created by NA doesn't have this column answered

      OPEN reassessment_cursor;

      FETCH NEXT FROM reassessment_cursor INTO @reassessment_id, @assessment_id, @innovation_id;

      -- Loop over the cursor
      WHILE @@FETCH_STATUS = 0
      BEGIN
          -- Delete the row from the reasseassment request
          DELETE FROM innovation_reassessment_request
          WHERE id = @reassessment_id;

          -- Delete the row from the assessment request
          DELETE FROM innovation_assessment
          WHERE id = @assessment_id;

          -- Get the new "current_assessment" after removing the invalid one.
          UPDATE innovation
          SET current_assessment_id = (
              SELECT TOP 1 id
              FROM innovation_assessment
              WHERE innovation_id = @innovation_id
              ORDER BY started_at DESC
          )
          WHERE id = @innovation_id

          -- Fetch the next row
          FETCH NEXT FROM reassessment_cursor INTO @reassessment_id, @assessment_id, @innovation_id;
      END

      CLOSE reassessment_cursor;
      DEALLOCATE reassessment_cursor;

      -- Turn ON history from assessment table
      ALTER TABLE innovation_assessment SET (SYSTEM_VERSIONING = ON (HISTORY_TABLE = [dbo].[innovation_assessment_history]));
    `);
  }

  public async down(): Promise<void> {}
}
