import type { MigrationInterface, QueryRunner } from 'typeorm';

export class migrationsNotificationPreferenceUpdateCommentToMessage1679666240591
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE notification_preference
      SET notification_id = 'MESSAGE'
      WHERE notification_id = 'COMMENT'
    `);
  }

  public async down(): Promise<void> {}
}
