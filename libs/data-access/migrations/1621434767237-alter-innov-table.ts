import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterInnovTable1621434767237 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "innovation" ADD other_main_category_description nvarchar(255)`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "innovation" DROP COLUMN other_main_category_description`);
  }
}
