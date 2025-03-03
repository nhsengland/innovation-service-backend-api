import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUrlToOrganisation1740668566569 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE organisation ADD url NVARCHAR(MAX);
  `);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE organisation DROP COLUMN url`);
  }
}
