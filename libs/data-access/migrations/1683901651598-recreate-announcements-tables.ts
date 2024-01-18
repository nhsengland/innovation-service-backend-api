import type { MigrationInterface, QueryRunner } from 'typeorm';

export class recreateAnnouncementsTables1683901651598 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "announcement_user"`);
    await queryRunner.query(`DROP TABLE "announcement"`);

    await queryRunner.query(`
      CREATE TABLE "announcement" (
        "id" uniqueidentifier NOT NULL CONSTRAINT "df_announcement_id" DEFAULT NEWSEQUENTIALID(),
        "title" nvarchar(100) NOT NULL,
        "template" nvarchar(100) NOT NULL,
        "user_roles" nvarchar(100) NOT NULL,
        "starts_at" datetime2 NOT NULL,
        "expires_at" datetime2,
        "params" nvarchar(max),
        "created_at" datetime2 NOT NULL CONSTRAINT "df_announcement_created_at" DEFAULT getdate(),
        "created_by" nvarchar(255),
        "updated_at" datetime2 NOT NULL CONSTRAINT "df_announcement_updated_at" DEFAULT getdate(),
        "updated_by" nvarchar(255),
        "deleted_at" datetime2,
        CONSTRAINT "pk_announcement_id" PRIMARY KEY ("id"),
        CONSTRAINT "CK_announcement_is_json" CHECK (ISJSON(params)=1)
      );
    `);

    await queryRunner.query(`

      CREATE TABLE "announcement_user" (
        "id" uniqueidentifier NOT NULL CONSTRAINT "df_announcement_user_id" DEFAULT NEWSEQUENTIALID(),
        "announcement_id" uniqueidentifier NOT NULL,
        "user_id" uniqueidentifier NOT NULL,
        "read_at" datetime2 NOT NULL,
        "created_at" datetime2 NOT NULL CONSTRAINT "df_announcement_user_created_at" DEFAULT getdate(),
        "created_by" nvarchar(255),
        "updated_at" datetime2 NOT NULL CONSTRAINT "df_announcement_user_updated_at" DEFAULT getdate(),
        "updated_by" nvarchar(255),
        "deleted_at" datetime2,
        CONSTRAINT "pk_announcement_user_id" PRIMARY KEY ("id"),
        CONSTRAINT "fk_announcement_user_announcement_id" FOREIGN KEY ("announcement_id") REFERENCES "announcement"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "fk_announcement_user_user_id" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
        );
      
        CREATE INDEX "idx_announcement_user_user_id_read_at" ON "announcement_user" ("announcement_id", "user_id");

    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "announcement_user"`);
    await queryRunner.query(`DROP TABLE "announcement"`);
  }
}
