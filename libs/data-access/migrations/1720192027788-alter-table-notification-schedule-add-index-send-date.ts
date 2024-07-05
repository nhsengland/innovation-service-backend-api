import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableNotificationScheduleAddIndexSendDate1720192027788 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notification_schedule" DROP CONSTRAINT "fk_notification_schedule_user_role_id";
      ALTER TABLE "notification_schedule" DROP CONSTRAINT "df_notification_schedule_params";
      ALTER TABLE "notification_schedule" DROP CONSTRAINT "ck_notification_schedule_params_is_json";
      ALTER TABLE "notification_schedule" DROP COLUMN "user_role_id";
      ALTER TABLE "notification_schedule" DROP COLUMN "params";
      CREATE INDEX "idx_notification_schedule_send_date" ON "notification_schedule" ("send_date");
    `);
  }

  async down(): Promise<void> {}
}
