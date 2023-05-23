import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableNotificationUserEntityAddRole1676476916512 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fix some data that might be wrong
    await queryRunner.query(`
        UPDATE user_role
          SET organisation_id = ou.organisation_id
          FROM user_role r
          INNER JOIN [user] u ON r.user_id=u.id
          INNER JOIN organisation_user ou ON u.id = ou.user_id
          WHERE r.organisation_id is null AND r.role IN ('INNOVATOR', 'ACCESSOR', 'QUALIFYING_ACCESSOR');
        
        UPDATE user_role
          SET organisation_unit_id= ouu.organisation_unit_id
          FROM user_role r
          INNER JOIN [user] u ON r.user_id=u.id
          INNER JOIN organisation_user ou ON u.id = ou.user_id
          INNER JOIN organisation_unit_user ouu ON ouu.organisation_user_id = ou.id
          WHERE r.organisation_unit_id is null AND r.role IN ('ACCESSOR', 'QUALIFYING_ACCESSOR');
      `);

    await queryRunner.query(`ALTER TABLE "notification_user" ADD "user_role_id" uniqueidentifier NULL`);

    await queryRunner.query(`
        UPDATE notification_user
          SET "user_role_id"=r.id
          FROM notification_user n
          INNER JOIN user_role r on n.user_id = r.user_id and n.organisation_unit_id = r.organisation_unit_id;

        UPDATE notification_user
          SET "user_role_id"=r.id
          FROM notification_user n
          INNER JOIN user_role r on n.user_id = r.user_id
          WHERE user_role_id IS NULL;
      `);

    await queryRunner.query(`ALTER TABLE "notification_user" ALTER COLUMN "user_role_id" uniqueidentifier NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "notification_user" DROP COLUMN "user_role_id"`);
  }
}
