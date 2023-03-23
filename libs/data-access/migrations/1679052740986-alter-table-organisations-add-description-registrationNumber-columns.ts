import type { MigrationInterface, QueryRunner } from 'typeorm';

export class migrationsAlterTableOrganisationsAddDescriptionAndRegistrationNumberColumns1679052740986 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE organisation ADD description nvarchar(50) NULL;
      ALTER TABLE organisation ADD registrationNumber nvarchar(8) NULL;
    `);
  }

  public async down(): Promise<void> { }

}
