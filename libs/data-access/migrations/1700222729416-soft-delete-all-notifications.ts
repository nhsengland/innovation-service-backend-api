import type { MigrationInterface, QueryRunner } from 'typeorm';

export class softDeleteAllNotifications1700222729416 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE notification_user
      SET deleted_at = GETDATE()
      WHERE deleted_at IS NULL;

      UPDATE notification
      SET deleted_at = GETDATE();
      WHERE deleted_at IS NULL;
    `);
  }

  public async down(): Promise<void> {}
}
