import type { MigrationInterface, QueryRunner } from 'typeorm';

export class createNotificationLog1664785209465 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "notification_log" (
      "id" uniqueidentifier NOT NULL CONSTRAINT "df_notification_log_id" DEFAULT NEWSEQUENTIALID(),
      "created_at" datetime2 NOT NULL CONSTRAINT "df_notification_log_created_at" DEFAULT getdate(), 
      "created_by" nvarchar(255), 
      "updated_at" datetime2 NOT NULL CONSTRAINT "df_notification_log_updated_at" DEFAULT getdate(), 
      "updated_by" nvarchar(255), 
      "deleted_at" datetime2 NULL,
      "notification_type" varchar(50) NOT NULL,
      "params" nvarchar(max) NOT NULL,
      CONSTRAINT "pk_notification_log_id" PRIMARY KEY ("id"))`);

    await queryRunner.query(
      `ALTER TABLE "notification_log" ADD CONSTRAINT "CK_notification_log_notification_type"
        CHECK (notification_type IN ('QA_A_IDLE_SUPPORT'))`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE notification_log`);
  }
}
