import type { MigrationInterface, QueryRunner } from 'typeorm';

export class refactorNotificationPreferences1697467482516 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        DROP TABLE notification_preference;

        CREATE TABLE notification_preference (
          "user_role_id" uniqueidentifier NOT NULL,
          "preferences" nvarchar(max),
          "created_at" datetime2 NOT NULL CONSTRAINT "df_notification_preference_created_at" DEFAULT getdate(),
          "created_by" uniqueidentifier NOT NULL,
          "updated_at" datetime2 NOT NULL CONSTRAINT "df_notification_preference_updated_at" DEFAULT getdate(),
          "updated_by" uniqueidentifier NOT NULL,
          "deleted_at" datetime2 NULL,
          CONSTRAINT "pk_notification_preference_id" PRIMARY KEY ("user_role_id"),
          CONSTRAINT "fk_notification_preference_user_role_id" FOREIGN KEY ("user_role_id") REFERENCES "user_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
          CONSTRAINT "CK_notification_preference_preferences_is_json" CHECK (ISJSON(preferences)=1)
        );
      `);
  }

  public async down(): Promise<void> {}
}
