import type { MigrationInterface, QueryRunner } from 'typeorm';

export class createTableExportRequest1667910679991 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      Create Table [dbo].[innovation_export_request] (
        [id] uniqueidentifier NOT NULL CONSTRAINT "df_innovation_export_request_id" DEFAULT NEWSEQUENTIALID(),
        [innovation_id] uniqueidentifier NOT NULL,
        [organisation_unit_id] uniqueidentifier NOT NULL,
        [status] varchar(50) CHECK( status IN ('PENDING','APPROVED','REJECTED','CANCELED') ) NOT NULL,
        [request_reason] varchar(255) NOT NULL,
        [reject_reason] varchar(255) NULL,
        [created_at] datetime2(7) NOT NULL CONSTRAINT "df_innovation_export_request_created_at" DEFAULT getdate(), 
        [updated_at] datetime2(7) NOT NULL CONSTRAINT "df_innovation_export_request_updated_at" DEFAULT getdate(), 
        [deleted_at] datetime2(7) NULL,
        [created_by] uniqueidentifier NOT NULL,
        [updated_by] uniqueidentifier NOT NULL,
        [deleted_by] uniqueidentifier NULL,
        CONSTRAINT [PK_export_request] PRIMARY KEY ([id])
      );
      `);

    await queryRunner.query(
      `ALTER TABLE "innovation_export_request" ADD CONSTRAINT "fk_innovation_export_request_innovation_id" FOREIGN KEY ("innovation_id") REFERENCES "innovation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE "innovation_export_request" ADD CONSTRAINT "fk_innovation_export_request_organisation_unit_id" FOREIGN KEY ("organisation_unit_id") REFERENCES "organisation_unit"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP CONSTRAINT "fk_export_request_organisation_unit_id"`);
    await queryRunner.query(`DROP CONSTRAINT "fk_export_request_innovation_id"`);
    await queryRunner.query(`DROP TABLE [dbo].[export_request]`);
  }
}
