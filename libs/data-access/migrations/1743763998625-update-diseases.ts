import type { MigrationInterface, QueryRunner } from 'typeorm';
import { IR_SCHEMA } from '../../shared/schemas/innovation-record/schema';

export class updateDiseasesQuestion1743763998625 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      UPDATE innovation_record_schema
      SET [schema] = JSON_MODIFY([schema], '$.sections[1].subSections[0].steps[5].questions[0]', JSON_QUERY(@0))
    `,
      [JSON.stringify(IR_SCHEMA.sections[1]?.subSections[0]?.steps[5]?.questions[0])]
    );
  }

  public async down(): Promise<void> {}
}
