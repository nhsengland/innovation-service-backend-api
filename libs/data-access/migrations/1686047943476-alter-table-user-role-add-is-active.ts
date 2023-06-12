import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableUserRoleAddIsActive1686047943476 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE user_role ADD is_active BIT NOT NULL CONSTRAINT "df_user_role_is_active" DEFAULT 1;`
    );
    await queryRunner.query(`
      UPDATE user_role SET is_active = 0 WHERE locked_at IS NOT NULL;
      UPDATE user_role SET deleted_at = NULL, is_active = 0 WHERE deleted_at IS NOT NULL;
      ALTER TABLE user_role DROP COLUMN locked_at;
      ALTER TABLE user_role DROP CONSTRAINT df_user_role_active_since;
      ALTER TABLE user_role DROP COLUMN active_since;
    `);
  }

  public async down(): Promise<void> {}
}
