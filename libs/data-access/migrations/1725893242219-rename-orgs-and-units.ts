import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameOrgsAndUnits1725893242219 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        UPDATE organisation SET name='Department for Business and Trade (DBT)' WHERE name='Department for Business and Trade';
        UPDATE organisation SET name='Health Research Authority (HRA)' WHERE name='Health Research Authority';
        UPDATE organisation SET name='Health Technology Wales (HTW)' WHERE name='Health Technology Wales';
        UPDATE organisation SET name='Medicines and Healthcare products Regulatory Agency (MHRA)' WHERE name='MHRA';
        UPDATE organisation SET name='National Institute for Health and Care Excellence (NICE)' WHERE name='NICE';
        UPDATE organisation SET name='National Institute for Health and Care Research (NIHR)' WHERE name='National Institute for Health and Care Research';
        UPDATE organisation SET name='NHS England Specialised Commissioning', acronym='Spec Com'  WHERE name='NHSE Specialised Commissioning';
        UPDATE organisation SET name='Scottish Health Technologies Group (SHTG)' WHERE name='Scottish Health Technologies Group';
        UPDATE organisation SET name='Health Innovation Network (HIN)' WHERE name='Health Innovation Network';

        UPDATE organisation_unit SET acronym='HI-EM' WHERE name='Health Innovation East Midlands';
        UPDATE organisation_unit SET acronym='HI-East' WHERE name='Health Innovation East';
        UPDATE organisation_unit SET acronym='HI-Man' WHERE name='Health Innovation Manchester';
        UPDATE organisation_unit SET acronym='HIN-SL' WHERE name='Health Innovation Network South London';
        UPDATE organisation_unit SET name='Health Innovation Kent, Surrey and Sussex', acronym='HI-KSS' WHERE name='Health Innovation Kent Surrey Sussex';
        UPDATE organisation_unit SET name='Health Innovation North East and North Cumbria', acronym='HI-NENC' WHERE name='Health Innovation North East North Cumbria';
        UPDATE organisation_unit SET acronym='HI-NWC' WHERE name='Health Innovation North West Coast';
        UPDATE organisation_unit SET acronym='HI-OTV' WHERE name='Health Innovation Oxford and Thames Valley';
        UPDATE organisation_unit SET acronym='HI-SW' WHERE name='Health Innovation South West';
        UPDATE organisation_unit SET acronym='HI-Wessex' WHERE name='Health Innovation Wessex';
        UPDATE organisation_unit SET acronym='HI-WM' WHERE name='Health Innovation West Midlands';
        UPDATE organisation_unit SET acronym='HI-West' WHERE name='Health Innovation West of England';
        UPDATE organisation_unit SET acronym='HI-YH' WHERE name='Health Innovation Yorkshire and Humber';
        `);
  }

  public async down(): Promise<void> {}
}
