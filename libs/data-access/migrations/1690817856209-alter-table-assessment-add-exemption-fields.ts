import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableAssessmentAddExemptionFields1690817856209 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "innovation_assessment" ADD "exempted_reason" NVARCHAR(100) NULL;
      ALTER TABLE "innovation_assessment" ADD "exempted_message" NVARCHAR(MAX) NULL;
      ALTER TABLE "innovation_assessment" ADD "exempted_at" datetime2 NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    ALTER TABLE "innovation_assessment" DROP COLUMN "exempted_reason";
    ALTER TABLE "innovation_assessment" DROP COLUMN "exempted_message";
    ALTER TABLE "innovation_assessment" DROP COLUMN "exempted_at";
  `);
  }
}
