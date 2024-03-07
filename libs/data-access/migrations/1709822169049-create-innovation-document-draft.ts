import type { MigrationInterface, QueryRunner } from 'typeorm';

export class createInnovationDocumentDraftTable1709822169049 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE innovation_document_draft (
        id uniqueidentifier NOT NULL,
        version AS JSON_VALUE(document,'$.version'),
        document nvarchar(max) NOT NULL CONSTRAINT "df_innovation_document_draft_document" DEFAULT '{}',
        "created_at" datetime2 NOT NULL CONSTRAINT "df_innovation_document_draft_created_at" DEFAULT getdate(),
        "created_by" uniqueidentifier,
        "updated_at" datetime2 NOT NULL CONSTRAINT "df_innovation_document_draft_updated_at" DEFAULT getdate(),
        "updated_by" uniqueidentifier,
        "deleted_at" datetime2,
        CONSTRAINT "pk_innovation_document_draft_id" PRIMARY KEY ("id"),
        CONSTRAINT "CK_innovation_document_draft_document_is_json" CHECK (ISJSON(document)=1)
      );
    `);

    // TODO: still needs to add the migration
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "innovation_document_draft";`);
  }
}
