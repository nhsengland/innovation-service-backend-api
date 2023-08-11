import type { MigrationInterface, QueryRunner } from 'typeorm';

export class createTableInnovationShareRequest1691072525464 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "innovation_export_request"`);
    await queryRunner.query(`
        CREATE TABLE innovation_export_request (
          "id" uniqueidentifier NOT NULL CONSTRAINT "df_innovation_export_request_id" DEFAULT NEWSEQUENTIALID(),
          "created_by_user_role_id" uniqueidentifier NOT NULL,
          "innovation_id" uniqueidentifier NOT NULL,
          "status" nvarchar(50) NOT NULL,
          "request_reason" nvarchar(2000) NOT NULL,
          "reject_reason" nvarchar(2000) NULL,
          "created_at" datetime2 NOT NULL CONSTRAINT "df_innovation_export_request_created_at" DEFAULT getdate(),
          "created_by" uniqueidentifier NOT NULL,
          "updated_at" datetime2 NOT NULL CONSTRAINT "df_innovation_export_request_updated_at" DEFAULT getdate(),
          "updated_by" uniqueidentifier NOT NULL,
          "deleted_at" datetime2 NULL,
          CONSTRAINT "pk_innovation_export_request_id" PRIMARY KEY ("id"),
          CONSTRAINT "fk_innovation_export_request_created_by_user_role_id" FOREIGN KEY ("created_by_user_role_id") REFERENCES "user_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
          CONSTRAINT "fk_innovation_export_request_innovation_id" FOREIGN KEY ("innovation_id") REFERENCES "innovation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        );
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "innovation_export_request"`);
  }
}
