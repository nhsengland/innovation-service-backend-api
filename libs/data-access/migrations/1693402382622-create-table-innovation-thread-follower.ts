import type { MigrationInterface, QueryRunner } from 'typeorm';

export class createTableInnovationThreadFollower1693402382622 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "innovation_thread_follower" (
			"innovation_thread_id" uniqueidentifier NOT NULL, 
      "user_role_id" uniqueidentifier NOT NULL,
			[valid_from] datetime2 GENERATED ALWAYS AS ROW START,
			[valid_to] datetime2 GENERATED ALWAYS AS ROW END,
			PERIOD FOR SYSTEM_TIME (valid_from, valid_to),
			CONSTRAINT "pk_innovation_thread_follower_innovation_thread_id_user_role_id" PRIMARY KEY ("innovation_thread_id", "user_role_id")
		) with (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.innovation_thread_follower_history, History_retention_period = 7 YEAR));`);

    await queryRunner.query(
      `ALTER TABLE "innovation_thread_follower" ADD CONSTRAINT "fk_innovation_thread_follower_innovation_thread_id" FOREIGN KEY ("innovation_thread_id") REFERENCES "innovation_thread"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE "innovation_thread_follower" ADD CONSTRAINT "fk_innovation_thread_follower_user_role_id" FOREIGN KEY ("user_role_id") REFERENCES "user_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );

  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "innovation_thread_follower" DROP CONSTRAINT "fk_innovation_thread_follower_innovation_id"`
    );

    await queryRunner.query(
      `ALTER TABLE "innovation_thread_follower" DROP CONSTRAINT "fk_innovation_thread_follower_user_role_id"`
    );

    await queryRunner.query(`ALTER TABLE "innovation_thread_follower" SET ( SYSTEM_VERSIONING = OFF )`);
    await queryRunner.query(`DROP TABLE "innovation_thread_follower"`);
  }
}
