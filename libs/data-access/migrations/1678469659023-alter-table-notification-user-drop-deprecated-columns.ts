import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableNotificationUserDropDeprecatedColumns1678469659023
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX "idx_notification_user_role_read" ON "notification_user" ("user_role_id", "read_at") WHERE deleted_at IS NULL;
      CREATE UNIQUE INDEX "idx_unique_notification_user_role" ON "notification_user" ("notification_id", "user_role_id");
      ALTER TABLE "notification_user" ADD CONSTRAINT "fk_notification_user_role_id" FOREIGN KEY ("user_role_id") REFERENCES "user_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      ALTER TABLE "notification_user" DROP CONSTRAINT "fk_notification_user_user_id";
      DROP INDEX "idx_unique_notification_user_organisation_unit" ON notification_user;
      DROP INDEX "idx_notification_user_read" ON notification_user;
      DROP INDEX "idx_notification_user_organisation_unit_read" ON notification_user;
      ALTER TABLE "notification_user" DROP COLUMN organisation_unit_id;
      ALTER TABLE "notification_user" DROP COLUMN user_id;
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // deprecating the down migration
  }
}
