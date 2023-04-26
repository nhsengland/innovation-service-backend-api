import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableNotificationUserAddSequencePK1674467472273 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // This id column is here for typeorm only, it is not used in the database
    await queryRunner.query(`
      ALTER TABLE notification_user ADD "id" BIGINT IDENTITY(1,1) NOT NULL;
      ALTER TABLE notification_user ADD CONSTRAINT [pk_notification_user_id] PRIMARY KEY ("id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE notification_user DROP CONSTRAINT [pk_notification_user_id];
      ALTER TABLE notification_user DROP COLUMN "id";
    `);
  }
}
