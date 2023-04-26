import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterInnovationAssessmentTableAddNewColumn1638789502258 implements MigrationInterface {
  name = 'alterInnovationAssessmentTableAddNewColumn1638789502258';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "innovation_assessment" ADD maturity_level_comment nvarchar(150) NULL;`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "innovation_assessment" DROP COLUMN "maturity_level_comment"`
    );
  }
}
