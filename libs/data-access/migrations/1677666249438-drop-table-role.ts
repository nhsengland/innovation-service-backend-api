import type { MigrationInterface, QueryRunner } from 'typeorm';

export class dropTableRole1677666249438 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP table role`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "role" (
      "created_at" datetime2 NOT NULL CONSTRAINT "df_role_created_at" DEFAULT getdate(), 
      "created_by" nvarchar(255), 
      "updated_at" datetime2 NOT NULL CONSTRAINT "df_role_updated_at" DEFAULT getdate(), 
      "updated_by" nvarchar(255),
      "deleted_at" datetime2,
      "id" uniqueidentifier NOT NULL CONSTRAINT "df_role_id" DEFAULT NEWSEQUENTIALID(),
      "name" nvarchar(100) NOT NULL,
      CONSTRAINT "pk_role_id" PRIMARY KEY ("id")
    )`);
  }
}
