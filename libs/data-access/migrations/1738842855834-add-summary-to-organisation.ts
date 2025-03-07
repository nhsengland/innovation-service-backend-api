import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSummaryToOrganisation1738842855834 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE organisation ADD summary NVARCHAR(MAX);
  `);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE organisation DROP COLUMN summary`);
  }
}
