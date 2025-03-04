import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWebsiteToOrganisation1740668566569 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE organisation ADD website NVARCHAR(200);
  `);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE organisation DROP COLUMN website`);
  }
}
