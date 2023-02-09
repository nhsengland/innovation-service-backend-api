import type { MigrationInterface, QueryRunner } from 'typeorm';

export class threadsAndActionsAssignRole1675940154813 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`
        UPDATE innovation_thread
          SET author_user_role_id = ur.id
        FROM innovation_thread it
        INNER JOIN user_role ur on it.created_by = ur.user_id
        where it.author_user_role_id is null
      `);

      await queryRunner.query(`
        UPDATE innovation_thread_message
            SET author_user_role_id = ur.id
        FROM innovation_thread_message itm
        INNER JOIN user_role ur on itm.created_by = ur.user_id
        where itm.author_user_role_id is null
      `);

      await queryRunner.query(`
        UPDATE innovation_action
            SET created_by_user_role_id = ur.id
        FROM innovation_action ia
        inner join user_role ur on ia.created_by = ur.user_id
        where ia.created_by_user_role_id is null
      `);

      await queryRunner.query(`
        UPDATE innovation_action
            SET updated_by_user_role_id = ur.id
        FROM innovation_action ia
        inner join user_role ur on ia.updated_by = ur.user_id
        where ia.updated_by_user_role_id is null
      `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
      await queryRunner.query(`PRINT 'This migration cannot be reverted'`);
    }

}
