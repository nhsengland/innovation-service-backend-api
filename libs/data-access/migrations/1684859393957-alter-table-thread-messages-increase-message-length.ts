import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableThreadMessagesIncreaseMessageLength1684859393957 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`
      ALTER TABLE "innovation_thread_message" ALTER COLUMN message nvarchar(4000);
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`
      ALTER TABLE "innovation_thread_message" ALTER COLUMN message nvarchar(2000);
    `);

  }

}
