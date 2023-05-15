import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableNotificationPreferenceAddRoleId1683812948918 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    //create new table from notification_preference with user_role_id instead of user_id
    await queryRunner.query(`SELECT p.created_by , p.created_at, p.updated_by, p.updated_at, p.notification_id, p.preference, r.id as user_role_id
      INTO notification_pref_new
      FROM notification_preference p
      INNER JOIN user_role r ON r.user_id = p.user_id
      WHERE r.role IN ('ACCESSOR', 'QUALIFYING_ACCESSOR', 'INNOVATOR')`);
    
    //drop old notification_preference table
    await queryRunner.query(`DROP TABLE notification_preference`);

    //rename new table with old notification_preference table name
    await queryRunner.query(`EXEC sp_RENAME "notification_pref_new", "notification_preference"`);

    //rename notification_id column to notification_type
    await queryRunner.query(`EXEC sp_RENAME "notification_preference.notification_id", "notification_type", "COLUMN"`);

    //add new key (user_role_id, notification_id)
    await queryRunner.query(`ALTER TABLE notification_preference ADD CONSTRAINT "pk_notification_preference_id" PRIMARY KEY ("user_role_id", "notification_type")`);

    //set user_role_id as foreign key
    await queryRunner.query(`ALTER TABLE "notification_preference" ADD CONSTRAINT "fk_notification_preference_user_role_id" FOREIGN KEY ("user_role_id") REFERENCES "user_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(): Promise<void> {}
}
