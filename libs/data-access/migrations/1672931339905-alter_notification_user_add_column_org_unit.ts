import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterNotificationUserAddColumnOrgUnit1672931339905 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // MUST BE NULLABLE because not all users have units or orgs
    await queryRunner.query(
      `ALTER TABLE "notification_user" ADD organisation_unit_id uniqueidentifier NULL;`
    );
    await queryRunner.query(
      `
        UPDATE notification_user 
        SET organisation_unit_id = orgunit.id
        FROM 
            notification_user nuser
        LEFT JOIN organisation_user orguser on orguser.user_id = nuser.user_id
        LEFT JOIN organisation_unit_user orgunituser on orgunituser.organisation_user_id = orguser.id
        LEFT JOIN organisation_unit orgunit on orgunit.id = orgunituser.organisation_unit_id
        `
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notification_user_organisation_unit_read" ON "notification_user" ("user_id", "organisation_unit_id", "read_at") WHERE deleted_at IS NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "idx_notification_user_organisation_unit_read" ON "notification_user"`
    );
    await queryRunner.query(`ALTER TABLE "notification_user" DROP COLUMN organisation_unit_id;`);
  }
}
