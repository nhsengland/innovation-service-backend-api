import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameAHSN1698314580972 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE organisation SET name='Health Innovation Network' WHERE name='AHSN Network' and type='ACCESSOR';
      UPDATE organisation_unit SET name='Health Innovation East Midlands' WHERE name='East Midlands AHSN';
      UPDATE organisation_unit SET name='Health Innovation East' WHERE name='Eastern AHSN';
      UPDATE organisation_unit SET name='Health Innovation Kent Surrey Sussex' WHERE name='Kent Surrey Sussex AHSN';
      UPDATE organisation_unit SET name='Health Innovation North East North Cumbria' WHERE name='North East and North Cumbria AHSN';
      UPDATE organisation_unit SET name='Health Innovation North West Coast' WHERE name='Innovation Agency (North West Coast AHSN)';
      UPDATE organisation_unit SET name='Health Innovation Oxford and Thames Valley' WHERE name='Oxford AHSN';
      UPDATE organisation_unit SET name='Health Innovation South West' WHERE name='South West AHSN';
      UPDATE organisation_unit SET name='Health Innovation Wessex' WHERE name='Wessex AHSN';
      UPDATE organisation_unit SET name='Health Innovation West Midlands' WHERE name='West Midlands AHSN';
      UPDATE organisation_unit SET name='Health Innovation West of England' WHERE name='West of England AHSN';
      UPDATE organisation_unit SET name='Health Innovation Yorkshire and Humber' WHERE name='Yorkshire and Humber AHSN';

      UPDATE organisation SET acronym='HIN' WHERE acronym='AHSN' and type='ACCESSOR';
    `);
  }

  public async down(): Promise<void> {}
}
