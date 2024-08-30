import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterAnnouncementUserTableToChangeReadAtType1724922476734 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE announcement_user ALTER COLUMN read_at datetime2 NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE announcement_user ALTER COLUMN read_at datetime2 NOT NULL`);
  }
}
