import type { MigrationInterface, QueryRunner } from 'typeorm';

export class createTriggerSectionUpdateInnovation1679584714303 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TRIGGER tr_section_update_innovation ON innovation_section
        AFTER INSERT, UPDATE
      AS
        SET NOCOUNT ON;
      
      UPDATE innovation 
      SET updated_at = inserted.updated_at, updated_by = inserted.updated_by
      FROM innovation
      JOIN inserted ON innovation.id = inserted.innovation_id
    `);
  }

  public async down(): Promise<void> {}
}
