import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableAnnouncementAddStatusColumn1724951041940 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(` ALTER TABLE [announcement] ADD [status] nvarchar (255) NOT NULL DEFAULT ('SCHEDULED')`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE [announcement] DROP COLUMN [status]`);
  }
}
