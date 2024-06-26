import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableNotificationsDropContextDetailConstraint1678108087022 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      IF EXISTS (SELECT * FROM sys.check_constraints WHERE name='CK_notification_context_detail')
      ALTER TABLE "notification" DROP CONSTRAINT "CK_notification_context_detail"
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notification" ADD CONSTRAINT "CK_notification_context_detail" CHECK (context_detail IN (
        'LOCK_USER',
        'THREAD_CREATION',
        'THREAD_MESSAGE_CREATION',
        'COMMENT_CREATION',
        'COMMENT_REPLY',
        'ACTION_CREATION',
        'ACTION_UPDATE',
        'NEEDS_ASSESSMENT_COMPLETED',
        'NEEDS_ASSESSMENT_ORGANISATION_SUGGESTION',
        'INNOVATION_SUBMISSION',
        'SUPPORT_STATUS_UPDATE',
        'INNOVATION_REASSESSMENT_REQUEST',
        'INNOVATION_STOP_SHARING'
      ))`);
  }
}
