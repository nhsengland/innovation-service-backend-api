import type { MigrationInterface, QueryRunner } from 'typeorm';

const tables = ['innovation_document', 'innovation_document_draft'];

export class migratePrototypeNoToConceptStage1784031519584 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of tables) {
      await queryRunner.query(`
        UPDATE ${table}
        SET document = JSON_MODIFY(
          document,
          '$.UNDERSTANDING_OF_NEEDS.hasProductServiceOrPrototype',
          'CONCEPT_STAGE'
        )
        WHERE JSON_VALUE(
          document,
          '$.UNDERSTANDING_OF_NEEDS.hasProductServiceOrPrototype'
        ) = 'NO'
      `);
    }
  }

  async down(): Promise<void> {
    throw new Error(
      'This migration is irreversible: CONCEPT_STAGE may be a legitimate new answer and cannot be safely restored to NO.'
    );
  }
}
