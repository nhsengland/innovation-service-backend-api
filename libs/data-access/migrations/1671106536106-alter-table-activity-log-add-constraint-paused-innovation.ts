import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableActivityLogAddConstraintPausedInnovation1671106536106 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "activity_log" DROP CONSTRAINT "CK_activity_log_activity"
    `);

    await queryRunner.query(`
      ALTER TABLE "activity_log" ADD CONSTRAINT "CK_activity_log_activity" CHECK (activity IN (
        'INNOVATION_CREATION',
        'OWNERSHIP_TRANSFER',
        'SHARING_PREFERENCES_UPDATE',
        'SECTION_DRAFT_UPDATE',
        'SECTION_SUBMISSION',
        'INNOVATION_SUBMISSION',
        'NEEDS_ASSESSMENT_START',
        'NEEDS_ASSESSMENT_COMPLETED',
        'NEEDS_ASSESSMENT_EDITED',
        'ORGANISATION_SUGGESTION',
        'SUPPORT_STATUS_UPDATE',
        'COMMENT_CREATION',
        'ACTION_CREATION',
        'ACTION_STATUS_IN_REVIEW_UPDATE',
        'ACTION_STATUS_DECLINED_UPDATE',
        'ACTION_STATUS_COMPLETED_UPDATE',
        'ACTION_STATUS_REQUESTED_UPDATE',
        'THREAD_CREATION',
        'THREAD_MESSAGE_CREATION',
        'NEEDS_ASSESSMENT_REASSESSMENT_REQUESTED',
        'INNOVATION_PAUSE'
      ))`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "activity_log" DROP CONSTRAINT "CK_activity_log_activity"
    `);

    await queryRunner.query(`
      ALTER TABLE "activity_log" ADD CONSTRAINT "CK_activity_log_activity" CHECK (activity IN (
        'INNOVATION_CREATION',
        'OWNERSHIP_TRANSFER',
        'SHARING_PREFERENCES_UPDATE',
        'SECTION_DRAFT_UPDATE',
        'SECTION_SUBMISSION',
        'INNOVATION_SUBMISSION',
        'NEEDS_ASSESSMENT_START',
        'NEEDS_ASSESSMENT_COMPLETED',
        'NEEDS_ASSESSMENT_EDITED',
        'ORGANISATION_SUGGESTION',
        'SUPPORT_STATUS_UPDATE',
        'COMMENT_CREATION',
        'ACTION_CREATION',
        'ACTION_STATUS_IN_REVIEW_UPDATE',
        'ACTION_STATUS_DECLINED_UPDATE',
        'ACTION_STATUS_COMPLETED_UPDATE',
        'ACTION_STATUS_CANCELLED_UPDATE',
        'ACTION_STATUS_REQUESTED_UPDATE',
        'THREAD_CREATION', 'THREAD_MESSAGE_CREATION',
        'NEEDS_ASSESSMENT_REASSESSMENT_REQUESTED'
      ))`);
  }
}
