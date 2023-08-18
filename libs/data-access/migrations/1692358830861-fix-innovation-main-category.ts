import type { MigrationInterface, QueryRunner } from 'typeorm';

export class fixInnovationMainCategory1692358830861 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE innovation
      SET main_category = t.mainCategory, other_category_description = t.otherCategoryDescription
      FROM innovation 
      INNER JOIN (SELECT id, JSON_VALUE(document, '$.INNOVATION_DESCRIPTION.mainCategory') AS mainCategory, JSON_VALUE(document, '$.INNOVATION_DESCRIPTION.otherCategoryDescription') AS otherCategoryDescription from innovation_document) t ON t.id=innovation.id
      WHERE innovation.id=t.id AND (t.mainCategory IS NOT NULL OR t.otherCategoryDescription IS NOT NULL);
    `);
  }

  public async down(): Promise<void> {
    // Do nothing
  }
}
