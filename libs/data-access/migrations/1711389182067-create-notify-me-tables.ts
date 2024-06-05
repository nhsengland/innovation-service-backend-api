import type { MigrationInterface, QueryRunner } from 'typeorm';

export class createNotifyMeTables1711389182067 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE notify_me_subscription (
          "id" uniqueidentifier NOT NULL CONSTRAINT "df_notify_me_subscription_id" DEFAULT NEWSEQUENTIALID(),

          "innovation_id" uniqueidentifier NOT NULL,
          "user_role_id" uniqueidentifier NOT NULL,

          "event_type" AS JSON_VALUE(config,'$.eventType'),
          "subscription_type" AS JSON_VALUE(config,'$.subscriptionType'),

          "config" nvarchar(max) NOT NULL CONSTRAINT "df_notify_me_subscription_config" DEFAULT '{}',


          "created_at" datetime2 NOT NULL CONSTRAINT "df_notify_me_subscription_created_at" DEFAULT getdate(),
          "created_by" uniqueidentifier,
          "updated_at" datetime2 NOT NULL CONSTRAINT "df_notify_me_subscription_updated_at" DEFAULT getdate(),
          "updated_by" uniqueidentifier,
          "deleted_at" datetime2,

          CONSTRAINT "pk_notify_me_subscription_id" PRIMARY KEY ("id"),
          CONSTRAINT "fk_notify_me_subscription_innovation_id" FOREIGN KEY ("innovation_id") REFERENCES "innovation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
          CONSTRAINT "fk_notify_me_subscription_user_role_id" FOREIGN KEY ("user_role_id") REFERENCES "user_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
          CONSTRAINT "CK_notify_me_subscription_config_is_json" CHECK (ISJSON(config)=1)
      );

      CREATE TABLE notification_schedule (
          "subscription_id" uniqueidentifier NOT NULL,
          "user_role_id" uniqueidentifier NOT NULL,

          "params" nvarchar(max) NOT NULL CONSTRAINT "df_notification_schedule_params" DEFAULT '{}',

          "send_date" datetime2 NOT NULL,

          CONSTRAINT "fk_notification_schedule_subscription_id" FOREIGN KEY ("subscription_id") REFERENCES "notify_me_subscription"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
          CONSTRAINT "fk_notification_schedule_user_role_id" FOREIGN KEY ("user_role_id") REFERENCES "user_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
          CONSTRAINT "pk_notification_schedule_id" PRIMARY KEY ("subscription_id"),
          CONSTRAINT "CK_notification_schedule_params_is_json" CHECK (ISJSON(params)=1)
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE notification_schedule;
      DROP TABLE notify_me_subscription;
    `);
  }
}
