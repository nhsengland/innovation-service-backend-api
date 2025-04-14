import type { MigrationInterface, QueryRunner } from 'typeorm';
import { IR_SCHEMA } from '../../shared/schemas/innovation-record/schema';

export class updateIRRelevant1744644031556 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const translations = {
      COVID_19: 'EMERGING_INFECTIOUS_DISEASES',
      INDEPENDENCE_AND_PREVENTION: 'PREVENTIVE_CARE',
      PATIENT_ACTIVATION_AND_SELF_CARE: 'SUPPORTING_PEOPLE_HEALTH'
    };

    await queryRunner.query(
      `
      UPDATE innovation_record_schema
      SET [schema] = JSON_MODIFY([schema], '$.sections[0].subSections[0].steps[8].questions[0]', JSON_QUERY(@0))
    `,
      [JSON.stringify(IR_SCHEMA.sections[0]?.subSections[0]?.steps[8]?.questions[0])]
    );
  }

  public async down(): Promise<void> {}
}
