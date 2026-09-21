import type { MigrationInterface, QueryRunner } from 'typeorm';

export class createUserStrategicRoleTable1767819000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        IF OBJECT_ID(N'dbo.user_strategic_role', N'U') IS NOT NULL DROP TABLE dbo.user_strategic_role;
        CREATE TABLE "user_strategic_role" (
            "created_at" datetime2 NOT NULL CONSTRAINT "df_user_strategic_role_created_at" DEFAULT getdate(), 
            "created_by" nvarchar(255), 
            "updated_at" datetime2 NOT NULL CONSTRAINT "df_user_strategic_role_updated_at" DEFAULT getdate(), 
            "updated_by" nvarchar(255),
            "deleted_at" datetime2,
            "id" uniqueidentifier NOT NULL CONSTRAINT "df_user_strategic_role_id" DEFAULT NEWSEQUENTIALID(),
            "strategic_role" nvarchar(50) NOT NULL,
            "user_id" uniqueidentifier NOT NULL,
            "organisation_id" uniqueidentifier NOT NULL,
            CONSTRAINT "pk_user_strategic_role_id" PRIMARY KEY ("id")
        )
    `);

    await queryRunner.query(`
        ALTER TABLE "user_strategic_role" ADD CONSTRAINT "fk_user_strategic_role_user_user_id" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
        ALTER TABLE "user_strategic_role" ADD CONSTRAINT "fk_user_strategic_role_organisation_organisation_id" FOREIGN KEY ("organisation_id") REFERENCES "organisation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    `);

    await queryRunner.query(`
        CREATE INDEX "idx_user_strategic_role_user_id" ON "user_strategic_role" ("user_id");
        CREATE INDEX "idx_user_strategic_role_organisation_id" ON "user_strategic_role" ("organisation_id");
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_user_strategic_role_organisation_id" ON "user_strategic_role"`);
    await queryRunner.query(`DROP INDEX "idx_user_strategic_role_user_id" ON "user_strategic_role"`);
    await queryRunner.query(`ALTER TABLE "user_strategic_role" DROP CONSTRAINT "fk_user_strategic_role_organisation_organisation_id"`);
    await queryRunner.query(`ALTER TABLE "user_strategic_role" DROP CONSTRAINT "fk_user_strategic_role_user_user_id"`);
    await queryRunner.query(`DROP TABLE "user_strategic_role"`);
  }
}
