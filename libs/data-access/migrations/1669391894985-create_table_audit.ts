import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableAudit1669391894985 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            CREATE TABLE audit (
                "id" uniqueidentifier NOT NULL CONSTRAINT "df_audit_id" DEFAULT NEWSEQUENTIALID(), 
                "user_id" uniqueidentifier NOT NULL,
                "date" datetime2 NOT NULL,
                "action" nvarchar(50) NOT NULL,
                "target" nvarchar(50) NOT NULL,
                "target_id" uniqueidentifier,
                "innovation_id" uniqueidentifier,
                "invocation_id" nvarchar(255),
                "function_name" nvarchar(255)
            CONSTRAINT "pk_audit_id" PRIMARY KEY ("id"));
            CREATE INDEX "idx_audit_user_innovation_date" ON audit ("user_id", "innovation_id", "date" DESC);
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE audit`);
  }
}
