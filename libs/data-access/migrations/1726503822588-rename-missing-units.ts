import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameMissingUnits1726503822588 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    UPDATE organisation_unit SET name='Department for Business and Trade (DBT)' WHERE name='Department for Business and Trade';
    UPDATE organisation_unit SET name='Health Research Authority (HRA)' WHERE name='Health Research Authority';
    UPDATE organisation_unit SET name='Health Technology Wales (HTW)' WHERE name='Health Technology Wales';
    UPDATE organisation_unit SET name='Medicines and Healthcare products Regulatory Agency (MHRA)' WHERE name='MHRA';
    UPDATE organisation_unit SET name='National Institute for Health and Care Excellence (NICE)' WHERE name='NICE';
    UPDATE organisation_unit SET name='National Institute for Health and Care Research (NIHR)' WHERE name='National Institute for Health and Care Research';
    UPDATE organisation_unit SET name='Scottish Health Technologies Group (SHTG)' WHERE name='Scottish Health Technologies Group';
    `);
  }

  public async down(): Promise<void> {}
}
