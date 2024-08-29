import type { MigrationInterface, QueryRunner } from 'typeorm';

export class removeLegacyAnnouncements1724252708572 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE announcement DROP COLUMN template;`);

    await queryRunner.query(`DELETE FROM announcement_user`);
    await queryRunner.query(`DELETE FROM announcement`);
  }

  public async down(): Promise<void> {}
}
