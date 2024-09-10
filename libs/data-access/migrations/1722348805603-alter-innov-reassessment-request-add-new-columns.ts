import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterInnovAddNewColumnsReassessmentRequestTable1722348805603 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "innovation_reassessment_request" ADD reassessment_reason nvarchar(150) NULL`);
    await queryRunner.query(
      `ALTER TABLE "innovation_reassessment_request" ADD other_reassessment_reason nvarchar(100) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_reassessment_request" ADD what_support_do_you_need nvarchar(1500) NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_reassessment_request" ALTER COLUMN description nvarchar(1500) NOT NULL`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "innovation_reassessment_request" DROP COLUMN "reassessment_reason"`);
    await queryRunner.query(`ALTER TABLE "innovation_reassessment_request" DROP COLUMN "other_reassessment_reason"`);
    await queryRunner.query(`ALTER TABLE "innovation_reassessment_request" DROP COLUMN "what_support_do_you_need"`);
    await queryRunner.query(
      `ALTER TABLE "innovation_reassessment_request" ALTER COLUMN description nvarchar(200) NOT NULL`
    );
  }
}
