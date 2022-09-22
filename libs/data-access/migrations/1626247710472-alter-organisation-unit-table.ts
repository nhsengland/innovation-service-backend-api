import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterOrganisationUnitTable1626247710472 implements MigrationInterface {

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organisation_unit" ADD "is_shadow" bit NOT NULL CONSTRAINT "df_organisation_unit_is_shadow" DEFAULT 0`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "organisation_unit" DROP CONSTRAINT "df_organisation_unit_is_shadow"`
    );
    await queryRunner.query(
      `ALTER TABLE "organisation_unit" DROP COLUMN "is_shadow"`
    );
  }

}
