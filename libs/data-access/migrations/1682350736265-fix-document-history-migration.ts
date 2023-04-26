import type { MigrationInterface, QueryRunner } from 'typeorm';

export class fixDocumentHistoryMigration1682350736265 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // SQL Temporal tables ignore rows that have the same valid_from/valid_to values so we need to make the original IR 1 min older
    // for all intended purposes it is as if the row doesn't exist when doing select for system_time all
    await queryRunner.query(`ALTER TABLE innovation_document SET ( SYSTEM_VERSIONING = OFF);`);

    await queryRunner.query(`UPDATE innovation_document_history SET valid_from = DATEADD(minute, -1, valid_from)
      WHERE description='Initial IR document'`);

    await queryRunner.query(
      `ALTER TABLE innovation_document SET (SYSTEM_VERSIONING = ON (HISTORY_TABLE = [dbo].[innovation_document_history]));`
    );
  }

  public async down(): Promise<void> {}
}
