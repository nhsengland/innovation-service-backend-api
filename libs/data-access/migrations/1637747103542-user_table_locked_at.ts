import type { MigrationInterface, QueryRunner } from 'typeorm';

export class userTableLockedAt1637747103542 implements MigrationInterface {

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD locked_at datetime2 NULL;`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "locked_at"`);
  }

}
