import type { MigrationInterface, QueryRunner } from 'typeorm';

export class migrateIrToPhaseTwo1720794103498 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['innovation_document', 'innovation_document_draft']) {
      // Add new hasWebsite field based on the website field.
      await queryRunner.query(`
        UPDATE ${table}
        SET document = JSON_MODIFY(document, '$.INNOVATION_DESCRIPTION.hasWebsite', (
            CASE
                WHEN JSON_VALUE(document, '$.INNOVATION_DESCRIPTION.website') IS NOT NULL
                THEN 'YES' ELSE 'NO'
            END
        ));
      `);

      // Divide countryName into two different values: officeLocation and countryLocation.
      await queryRunner.query(`
        UPDATE ${table}
        SET document = JSON_MODIFY(document, '$.INNOVATION_DESCRIPTION.officeLocation', (
            CASE
                WHEN JSON_VALUE(document, '$.INNOVATION_DESCRIPTION.countryName') IN ('England', 'Scotland', 'Wales', 'Northern Ireland')
                THEN JSON_VALUE(document, '$.INNOVATION_DESCRIPTION.countryName')
                ELSE 'Based outside UK'
            END
        ))
      `);
      await queryRunner.query(`
        UPDATE ${table}
        SET document = JSON_MODIFY(document, '$.INNOVATION_DESCRIPTION.countryLocation', (
            CASE
                WHEN JSON_VALUE(document, '$.INNOVATION_DESCRIPTION.countryName') NOT IN ('England', 'Scotland', 'Wales', 'Northern Ireland')
                THEN JSON_VALUE(document, '$.INNOVATION_DESCRIPTION.countryName')
                ELSE NULL
            END
        ))
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of ['innovation_document', 'innovation_document_draft']) {
      await queryRunner.query(
        `UPDATE ${table} SET document = JSON_MODIFY(document, '$.INNOVATION_DESCRIPTION.hasWebsite', NULL)`
      );
      await queryRunner.query(
        `UPDATE ${table} SET document = JSON_MODIFY(document, '$.INNOVATION_DESCRIPTION.officeLocation', NULL)`
      );
      await queryRunner.query(
        `UPDATE ${table} SET document = JSON_MODIFY(document, '$.INNOVATION_DESCRIPTION.countryLocation', NULL)`
      );
    }
  }
}
