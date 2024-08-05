import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTableInnovationAssessmentAddEditReason1722531073183 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE innovation_assessment
            ADD edit_reason nvarchar (2000) NULL;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE innovation_assessment
            DROP COLUMN edit_reason;
        `);
  }
}
