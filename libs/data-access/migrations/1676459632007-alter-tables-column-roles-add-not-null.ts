import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTablesColumnRolesAddNotNull1676459632007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "innovation_thread" ALTER COLUMN "author_user_role_id" uniqueidentifier NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_thread_message" ALTER COLUMN "author_user_role_id" uniqueidentifier NOT NULL`
    );
    await queryRunner.query('ALTER TABLE innovation_action SET (SYSTEM_VERSIONING = OFF)');
    await queryRunner.query(`
        UPDATE innovation_action
            SET created_by_user_role_id = ur.id
        FROM innovation_action ia
        INNER JOIN user_role ur ON ia.created_by = ur.user_id
        WHERE ia.created_by_user_role_id is null;

        UPDATE innovation_action_history
            SET created_by_user_role_id = ur.id
        FROM innovation_action_history ia
        INNER JOIN user_role ur ON ia.created_by = ur.user_id
        WHERE ia.created_by_user_role_id is null;

        UPDATE innovation_action
            SET updated_by_user_role_id = ur.id
        FROM innovation_action ia
        INNER JOIN user_role ur ON ia.updated_by = ur.user_id
        WHERE ia.updated_by_user_role_id is null;

        UPDATE innovation_action_history
            SET updated_by_user_role_id = ur.id
        FROM innovation_action_history ia
        INNER JOIN user_role ur ON ia.updated_by = ur.user_id
        WHERE ia.updated_by_user_role_id is null;
      `);

    await queryRunner.query(
      'ALTER TABLE innovation_action SET (SYSTEM_VERSIONING = ON (HISTORY_TABLE = [dbo].[innovation_action_history]))'
    );

    await queryRunner.query(`
        ALTER TABLE "innovation_action" ALTER COLUMN "created_by_user_role_id" uniqueidentifier NOT NULL;
        ALTER TABLE "innovation_action" ALTER COLUMN "updated_by_user_role_id" uniqueidentifier NOT NULL;
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "innovation_thread" ALTER COLUMN "author_user_role_id" uniqueidentifier NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_thread_message" ALTER COLUMN "author_user_role_id" uniqueidentifier NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_action" ALTER COLUMN "created_by_user_role_id" uniqueidentifier NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "innovation_action" ALTER COLUMN "updated_by_user_role_id" uniqueidentifier NULL`
    );
  }
}
