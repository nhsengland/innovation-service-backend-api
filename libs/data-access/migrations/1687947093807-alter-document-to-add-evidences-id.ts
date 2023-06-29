import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterDocumentToAddEvidences1687947093807 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE innovation_document
      SET document = JSON_MODIFY(d.document, '$.evidences', JSON_QUERY('[' + new.evidences + ']'))
      FROM innovation_document d
      INNER JOIN (
        SELECT t.id, STRING_AGG(evidences, ',') as evidences
        FROM (
          SELECT d.id, JSON_MODIFY(value, '$.id', convert(nvarchar(100), NEWID())) as evidences
          FROM innovation_document d
          CROSS APPLY openjson(d.document, '$.evidences')
        ) as t
        GROUP BY t.id
      ) new ON d.id = new.id
      WHERE d.id = new.id;
    `);
  }

  public async down(): Promise<void> {}
}
