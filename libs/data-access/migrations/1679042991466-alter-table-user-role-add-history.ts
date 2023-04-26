import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableUserRoleAddHistory1679042991466 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE user_role ADD
        [valid_from] datetime2 GENERATED ALWAYS AS ROW START CONSTRAINT df_user_role_valid_from DEFAULT SYSUTCDATETIME(),
        [valid_to] datetime2 GENERATED ALWAYS AS ROW END CONSTRAINT df_user_role_valid_to DEFAULT CONVERT(DATETIME2, '9999-12-31 23:59:59.9999999'),
        PERIOD FOR SYSTEM_TIME (valid_from, valid_to);
    `);

    await queryRunner.query(`
      ALTER TABLE user_role SET (SYSTEM_VERSIONING = ON (HISTORY_TABLE = [dbo].[user_role_history]));
    `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {
    // deprecated
  }
}
