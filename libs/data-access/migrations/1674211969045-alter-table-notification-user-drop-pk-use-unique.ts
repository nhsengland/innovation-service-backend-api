import type { MigrationInterface, QueryRunner } from 'typeorm';


export class alterTableNotificationUserDropPkUseUnique1674211969045 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {

    // This is awful but we need a nullable primary key and the id wouldn't be used for anything else
    await queryRunner.query(`
      ALTER TABLE notification_user DROP CONSTRAINT [pk_notification_user_id];
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_unique_notification_user_organisation_unit" ON "notification_user" ("notification_id", "user_id", "organisation_unit_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX [idx_unique_notification_user_organisation_unit] ON notification_user;
    `)

    await queryRunner.query(`
      ALTER TABLE notification_user ADD PRIMARY KEY ("notification_id", "user_id");
    `);
  }

}
