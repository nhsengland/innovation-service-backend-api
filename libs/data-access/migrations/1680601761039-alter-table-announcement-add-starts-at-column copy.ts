import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableAnnouncementAddStartAtColumn1680601761039 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE announcement ADD starts_at datetime2 NOT NULL CONSTRAINT "df_announcement_starts_at" DEFAULT getdate();
    `);
  }

  public async down(): Promise<void> {}
}
