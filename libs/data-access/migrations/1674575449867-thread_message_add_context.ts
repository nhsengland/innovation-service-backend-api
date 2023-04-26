import type { MigrationInterface, QueryRunner } from 'typeorm';

export class threadMessageAddContext1674575449867 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE innovation_thread_message ADD author_user_role_id uniqueidentifier NULL;
      `);

    await queryRunner.query(`
        ALTER TABLE innovation_thread_message ADD CONSTRAINT "fk_innovation_thread_message_author_user_role_id" FOREIGN KEY ("author_user_role_id") REFERENCES "user_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE innovation_thread_message DROP CONSTRAINT "fk_innovation_thread_message_author_user_role_id";
      `);

    await queryRunner.query(`
        ALTER TABLE innovation_thread_message DROP COLUMN author_user_role_id;
      `);
  }
}
