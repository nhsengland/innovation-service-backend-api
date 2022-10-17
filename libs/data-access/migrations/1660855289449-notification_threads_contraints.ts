import type { MigrationInterface, QueryRunner } from 'typeorm';

export class notificationThreadsContraints1660855289449 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(
      `ALTER TABLE "notification" DROP CONSTRAINT "CK_notification_context_type"`
    );

    await queryRunner.query(
      `ALTER TABLE "notification" DROP CONSTRAINT "CK_notification_context_detail"`
    );

    // activity_log table
    await queryRunner.query(
      `ALTER TABLE "notification" ADD CONSTRAINT "CK_notification_context_type" 
      CHECK (context_type IN ('INNOVATION','COMMENT','ACTION','NEEDS_ASSESSMENT','SUPPORT', 'THREAD'))`
    );

    await queryRunner.query(
      `ALTER TABLE "notification" ADD CONSTRAINT "CK_notification_context_detail"
      CHECK (context_detail IN (
        'LOCK_USER','COMMENT_CREATION',
        'COMMENT_REPLY','ACTION_CREATION',
        'ACTION_UPDATE', 'NEEDS_ASSESSMENT_COMPLETED',
        'NEEDS_ASSESSMENT_ORGANISATION_SUGGESTION', 'INNOVATION_SUBMISSION',
        'SUPPORT_STATUS_UPDATE', 'THREAD_CREATION', 'THREAD_MESSAGE_CREATION', 'THREAD_MESSAGE_UPDATE'
      ))`
    );

  }

  public async down(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(
      `ALTER TABLE "notification" DROP CONSTRAINT "CK_notification_context_type"`
    );

    await queryRunner.query(
      `ALTER TABLE "notification" DROP CONSTRAINT "CK_notification_context_detail"`
    );

    await queryRunner.query(
      `ALTER TABLE "notification" ADD CONSTRAINT "CK_notification_context_type"
      CHECK (context_type IN ('INNOVATION','COMMENT','ACTION','NEEDS_ASSESSMENT','SUPPORT'))`
    );

    await queryRunner.query(`
      ALTER TABLE "notification" ADD CONSTRAINT "CK_notification_context_detail" 
      CHECK (context_detail IN (
        'LOCK_USER','COMMENT_CREATION',
        'COMMENT_REPLY','ACTION_CREATION',
        'ACTION_UPDATE', 'NEEDS_ASSESSMENT_COMPLETED',
        'NEEDS_ASSESSMENT_ORGANISATION_SUGGESTION', 'INNOVATION_SUBMISSION',
        'SUPPORT_STATUS_UPDATE'
      ))
    `);

  }

}
