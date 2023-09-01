import type { MigrationInterface, QueryRunner } from 'typeorm';

export class migrateThreadParticipantsToThreadFollowers1693509147111 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO innovation_thread_follower (innovation_thread_id, user_role_id)
      SELECT DISTINCT m.innovation_thread_id, ur.id
      FROM innovation_thread_message m
      INNER JOIN user_role ur ON ur.id = m.author_user_role_id
      WHERE ur.role <> 'INNOVATOR'
      `
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`

      DELETE FROM innovation_thread_follower;

    `);
  }
}
