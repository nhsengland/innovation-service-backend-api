import type { MigrationInterface, QueryRunner } from 'typeorm';

export class updateInnovationThreadContextTypeConstraint1713365448834 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    ALTER TABLE "innovation_thread" DROP CONSTRAINT "CK_innovation_thread_context_type";
    ALTER TABLE "innovation_thread" ADD CONSTRAINT "CK_innovation_thread_context_type" 
    CHECK (context_type IN ('NEEDS_ASSESSMENT','SUPPORT', 'TASK', 'ORGANISATION_SUGGESTION'));
  `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
