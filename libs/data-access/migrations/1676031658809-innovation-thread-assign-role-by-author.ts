import type { MigrationInterface, QueryRunner } from 'typeorm';

export class innovationThreadAssignRoleByAuthor1676031658809 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        UPDATE innovation_thread
          SET author_user_role_id = ur.id
        FROM innovation_thread it
        INNER JOIN user_role ur on it.author_id = ur.user_id
        where it.author_user_role_id is null
      `);

    await queryRunner.query(`
        UPDATE innovation_thread_message
          SET author_user_role_id = ur.id
        FROM innovation_thread_message it
        INNER JOIN user_role ur on it.author_id = ur.user_id
        where it.author_user_role_id is null
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        Print 'This migration cannot be reverted'
      `);
  }
}
