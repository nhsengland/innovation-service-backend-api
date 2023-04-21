import type { MigrationInterface, QueryRunner } from 'typeorm';

export class deleteCommentNotifications1681908679253 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {

    const now = new Date();

    await queryRunner.query(`
      UPDATE notification_user
      SET deleted_at = @0
      WHERE notification_id IN (
        SELECT notification_id FROM notification_user nu
        INNER JOIN notification n ON n.id = nu.notification_id
        WHERE n.context_detail = 'COMMENT_CREATION' OR n.context_detail = 'COMMENT_REPLY'
      )
    `, [now]);
  }

  public async down(): Promise<void> { }

}
