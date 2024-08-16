import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AlterTableAnnouncementAddType1723653659893 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE [announcement]
            ADD [type] nvarchar (255) NOT NULL DEFAULT ('LOG_IN');
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE [announcement]
            DROP COLUMN [type];
        `);
  }
}
