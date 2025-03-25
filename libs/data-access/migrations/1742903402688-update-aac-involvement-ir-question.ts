import type { MigrationInterface, QueryRunner } from 'typeorm';
import { IR_SCHEMA } from '../../shared/schemas/innovation-record/schema';

// Rerun the import to fix the HIN aac as the schema wasn't updated
export class updateAacInvolvementIrQuestion1742903402688 implements MigrationInterface {
  newNamesMapper = new Map([['Health Innovation Network', 'Health Innovation Network (HIN)']]);

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE innovation_record_schema
      SET [schema] = JSON_MODIFY([schema], '$.sections[0].subSections[0].steps[13].questions[0]', JSON_QUERY(@0))
    `,
      [JSON.stringify(IR_SCHEMA.sections[0]?.subSections[0]?.steps[13]?.questions[0])]
    );

    for (const table of ['innovation_document', 'innovation_document_draft']) {
      for (const names of this.newNamesMapper) {
        await queryRunner.query(`
          UPDATE ${table}
          SET document=JSON_MODIFY(
            document,
            '$.INNOVATION_DESCRIPTION.involvedAACProgrammes',
            JSON_QUERY(
              REPLACE(
                JSON_QUERY(document, '$.INNOVATION_DESCRIPTION.involvedAACProgrammes'),
                '"${names[0]}"',
                '"${names[1]}"'
          ))) FROM ${table}
          WHERE JSON_QUERY(document, '$.INNOVATION_DESCRIPTION.involvedAACProgrammes') like '%"${names[0]}"%';
    `);
      }
    }
  }

  public async down(): Promise<void> {}
}
