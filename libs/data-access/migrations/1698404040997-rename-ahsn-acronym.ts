import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameAHSNAcronym1698404040997 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE organisation SET acronym='HIN' WHERE acronym='AHSN' and type='ACCESSOR';
      
      UPDATE organisation_unit SET acronym='NENC' WHERE name='Health Innovation North East North Cumbria';
      UPDATE organisation_unit SET acronym='EM' WHERE name='Health Innovation East Midlands';
      UPDATE organisation_unit SET acronym='EAST' WHERE name='Health Innovation East';
      UPDATE organisation_unit SET acronym='NWC' WHERE name='Health Innovation North West Coast';
      UPDATE organisation_unit SET acronym='WM' WHERE name='Health Innovation West Midlands';
      UPDATE organisation_unit SET acronym='WE', name='Health Innovation West of England' WHERE name='West of England AHSN';
      UPDATE organisation_unit SET acronym='HIM SL' WHERE name='Health Innovation Network South London';
      UPDATE organisation_unit SET acronym='OTV' WHERE name='Health Innovation Oxford and Thames Valley';
      UPDATE organisation_unit SET acronym='YH' WHERE name='Health Innovation Yorkshire and Humber';
      UPDATE organisation_unit SET acronym='KSS' WHERE name='Health Innovation Kent Surrey Sussex';
      UPDATE organisation_unit SET acronym='WESSEX' WHERE name='Health Innovation Wessex';
      UPDATE organisation_unit SET acronym='SW' WHERE name='Health Innovation South West';      
    `);
  }

  public async down(): Promise<void> {}
}
