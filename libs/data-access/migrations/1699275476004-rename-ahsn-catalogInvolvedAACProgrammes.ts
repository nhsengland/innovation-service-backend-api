import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameAHSNcatalogInvolvedAACProgrammes1699275476004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE innovation_document 
      SET document=JSON_MODIFY(
        document, 
        '$.INNOVATION_DESCRIPTION.involvedAACProgrammes', 
        JSON_QUERY(
          REPLACE(
            JSON_QUERY(document, '$.INNOVATION_DESCRIPTION.involvedAACProgrammes'),
            '"Academic Health Science Network"',
            '"Health Innovation Network"'
      ))) FROM innovation_document
      WHERE JSON_QUERY(document, '$.INNOVATION_DESCRIPTION.involvedAACProgrammes') like '%"Academic Health Science Network"%';
    `);
  }

  public async down(): Promise<void> {}
}
