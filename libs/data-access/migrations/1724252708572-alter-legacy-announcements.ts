import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterLegacyAnnouncements1724252708572 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE announcement DROP COLUMN template;`);

    await queryRunner.query(`
      UPDATE announcement
      SET params = JSON_OBJECT('content': JSON_VALUE(announcement.params, '$.inset.title'), 'link': JSON_VALUE(announcement.params, '$.inset.link'))
    `);
  }

  public async down(): Promise<void> {}
}
