import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterOrganisationUnitTable1625754676513 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "organisation_unit" ADD "acronym" nvarchar(20)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "organisation_unit" DROP COLUMN "acronym"`);
  }
}
