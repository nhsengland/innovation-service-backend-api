import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTableNotificationRemoveContextTypeConstraint1690199134929 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notification" DROP CONSTRAINT "CK_notification_context_type"
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notification" ADD CONSTRAINT "CK_notification_context_type" CHECK (context_type IN (
        'NEEDS_ASSESSMENT',
        'INNOVATION',
        'SUPPORT',
        'ACTION',
        'THREAD',
        'DATA_SHARING',
        'COMMENT'
      ))`);
  }
}
