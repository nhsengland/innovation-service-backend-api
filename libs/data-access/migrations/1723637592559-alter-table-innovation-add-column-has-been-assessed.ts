import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTableInnovationAddColumnHasBeenAssessed1723637592559 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE innovation ADD has_been_assessed BIT NOT NULL CONSTRAINT "df_innovation_has_been_assessed" DEFAULT 0;
    `);

    await queryRunner.query(`
      UPDATE innovation
      SET has_been_assessed=1
      WHERE id IN (
        SELECT DISTINCT innovation.id 
        FROM innovation
        INNER JOIN innovation_assessment on innovation.id = innovation_assessment.innovation_id
        WHERE innovation_assessment.finished_at IS NOT NULL 
        AND innovation_assessment.deleted_at IS NULL 
        AND innovation.deleted_at IS NULL
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE innovation DROP CONSTRAINT df_innovation_has_been_assessed;
      ALTER TABLE innovation DROP COLUMN has_been_assessed;
    `);
  }
}
