import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterInnovationStandardUniqueIndexAddDeletedAt1678967577427 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX "idx_innovation_standard_type_innovation_id" ON "innovation_standard";
      CREATE UNIQUE INDEX "idx_innovation_standard_type_innovation_id" ON "innovation_standard" ("type", "innovation_id") WHERE deleted_at IS NULL;
    `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // deprecated
  }
}
