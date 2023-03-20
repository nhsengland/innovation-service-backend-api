import type { MigrationInterface, QueryRunner } from 'typeorm';


export class alterTableActivityLogAddColumnUserRole1678898270292 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE activity_log ADD user_role_id uniqueidentifier NULL;`);

    await queryRunner.query(`
      UPDATE activity_log
      SET user_role_id = r.id
      FROM user_role r inner join (
        SELECT user_id, MIN(created_at) AS created FROM user_role GROUP BY user_id
      ) t ON r.user_id=t.user_id AND r.created_at=t.created;

      ALTER TABLE activity_log ALTER COLUMN "user_role_id" uniqueidentifier NOT NULL;
      ALTER TABLE activity_log ADD CONSTRAINT "fk_activity_log_user_role_id" FOREIGN KEY ("user_role_id") REFERENCES "user_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE activity_log DROP CONSTRAINT "fk_activity_log_user_role_id";
      ALTER TABLE activity_log DROP COLUMN user_role_id;
    `);
  }

}
