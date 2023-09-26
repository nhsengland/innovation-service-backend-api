import type { MigrationInterface, QueryRunner } from 'typeorm';

export class addMigrateTaskThreadFollower1695747143960 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    INSERT INTO innovation_thread_follower (innovation_thread_id, user_role_id)
    SELECT t.id,t.author_user_role_id FROM innovation_thread t 
    LEFT JOIN innovation_thread_follower f ON t.id = f.innovation_thread_id AND t.author_user_role_id=f.user_role_id
    WHERE t.context_type='TASK' AND f.innovation_thread_id IS NULL;
  `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
