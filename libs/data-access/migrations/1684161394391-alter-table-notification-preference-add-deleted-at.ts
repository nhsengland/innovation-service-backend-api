import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableNotificationPreferenceAddDeletedAt1684161394391 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE notification_preference ADD deleted_at datetime2`);
  }

  public async down(): Promise<void> {}
}
