import type { MigrationInterface, QueryRunner } from 'typeorm';

export class updateDocumentDiseasesWhenImpactDiseaseConditionIsNo1706114769492 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    update innovation_document 
    set document=JSON_MODIFY(document, '$.UNDERSTANDING_OF_NEEDS.diseasesConditionsImpact', JSON_QUERY('["NONE"]')) 
    where JSON_VALUE(document, '$.UNDERSTANDING_OF_NEEDS.impactDiseaseCondition')='No';
    `);
  }

  public async down(): Promise<void> {}
}
