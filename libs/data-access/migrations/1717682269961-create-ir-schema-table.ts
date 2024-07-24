import type { MigrationInterface, QueryRunner } from 'typeorm';
import { IR_SCHEMA } from '../../shared/schemas/innovation-record/schema';

export class createIrSchemaTable1717682269961 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE TABLE innovation_record_schema
        (
            "version" int IDENTITY(1,1) NOT NULL,
            "schema" nvarchar(max) NOT NULL CONSTRAINT "df_innovation_record_schema_document" DEFAULT '{}',
            "created_at" datetime2 NOT NULL CONSTRAINT "df_innovation_record_schema_created_at" DEFAULT getdate(),
            "created_by" uniqueidentifier,
            "updated_at" datetime2 NOT NULL CONSTRAINT "df_innovation_record_schema_updated_at" DEFAULT getdate(),
            "updated_by" uniqueidentifier,
            "deleted_at" datetime2,
            CONSTRAINT "pk_innovation_record_schema_id" PRIMARY KEY ("version"),
            CONSTRAINT "CK_innovation_record_schema_schema_is_json" CHECK (ISJSON("schema")=1)
        )
      `);

    await queryRunner.query(`
      INSERT INTO innovation_record_schema ("schema", "created_by", "updated_by")
      VALUES (@0, @1, @2)
    `, [JSON.stringify(IR_SCHEMA),'00000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000']);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE innovation_record_schema`);
  }
}
