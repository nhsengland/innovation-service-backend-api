import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterSupportLogTableAddParamsAndCreatedByUserRole1689608369414 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE innovation_support_log ADD "params" nvarchar(max) CONSTRAINT "CK_innovation_support_log_is_json" CHECK (ISJSON(params)=1);
        ALTER TABLE innovation_support_log ADD "created_by_user_role_id" uniqueidentifier NULL CONSTRAINT "fk_innovation_support_log_created_by_user_role_id" FOREIGN KEY ("created_by_user_role_id") REFERENCES "user_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
      `);

    // Populate the createdByUserRoleId
    await queryRunner.query(`
      UPDATE innovation_support_log
        SET created_by_user_role_id = ur.id
      FROM innovation_support_log l
      INNER JOIN user_role ur on ur.user_id = l.created_by AND ur.role IN ('QUALIFYING_ACCESSOR', 'ACCESSOR')
    `);

    // Make the column NOT NULL after populating all the values
    await queryRunner.query(`
      ALTER TABLE innovation_support_log ALTER COLUMN "created_by_user_role_id" uniqueidentifier NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE innovation_support_log DROP CONSTRAINT "CK_innovation_support_log_is_json";
        ALTER TABLE innovation_support_log DROP COLUMN "params";
      `);

    await queryRunner.query(`
        ALTER TABLE innovation_support_log DROP CONSTRAINT "fk_innovation_support_log_created_by_user_role_id";
        ALTER TABLE innovation_support_log DROP COLUMN "created_by_user_role_id";
      `);
  }
}
