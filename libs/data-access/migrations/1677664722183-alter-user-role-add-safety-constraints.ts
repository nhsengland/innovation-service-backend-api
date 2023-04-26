import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterUserRoleAddSafetyConstraints1677664722183 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_role ADD CONSTRAINT ck_user_role_organisation CHECK ((role in ('ACCESSOR', 'QUALIFYING_ACCESSOR', 'INNOVATOR') AND organisation_id IS NOT NULL) OR organisation_id IS NULL);
      ALTER TABLE user_role ADD CONSTRAINT ck_user_role_organisation_unit CHECK ((role in ('ACCESSOR', 'QUALIFYING_ACCESSOR') AND organisation_unit_id IS NOT NULL) OR organisation_unit_id IS NULL);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_role DROP CONSTRAINT ck_user_role_organisation;
      ALTER TABLE user_role DROP CONSTRAINT ck_user_role_organisation_unit;
    `);
  }
}
