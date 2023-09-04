import type { MigrationInterface, QueryRunner } from 'typeorm';

export class fixInnovationOtherCategory1692366128191 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE innovation
      SET other_category_description = NULL
      WHERE other_category_description IS NOT NULL AND main_category <> 'OTHER';
    `);
  }

  public async down(): Promise<void> {
    // Do nothing
  }
}
