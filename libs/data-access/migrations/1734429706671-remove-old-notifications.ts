import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class RemoveOldNotifications1734429706671 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE notification
      SET deleted_at = GETDATE()
      WHERE context_detail IN ('SH01_INNOVATION_STOPPED_SHARED_TO_ASSIGNED_USERS', 'SH03_INNOVATION_STOPPED_SHARED_TO_SELF' )
      `
    );
  }
  async down(): Promise<void> {}
}
