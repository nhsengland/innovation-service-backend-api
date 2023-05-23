import type { MigrationInterface, QueryRunner } from 'typeorm';

export class migrationsCreateAnnouncementAndAnnouncementUserTables1680011041629 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "announcement"
      (
          "id" uniqueidentifier NOT NULL CONSTRAINT "df_announcement_id" DEFAULT NEWSEQUENTIALID(),
          "template" nvarchar(100) NOT NULL,
          "target_roles" nvarchar(255) NOT NULL,
          "params" nvarchar(500),
          "expires_at" datetime2,
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
      CREATE TABLE "announcement_user"
      (
          "id" BIGINT IDENTITY(1,1) NOT NULL,
          "user_id" uniqueidentifier NOT NULL,
          "announcement_id" uniqueidentifier NOT NULL,
          "target_roles" nvarchar(255) NOT NULL,
          "read_at" datetime2,
          "deleted_at" datetime2,
          CONSTRAINT "pk_announcement_user_id" PRIMARY KEY ("id"),
          CONSTRAINT "fk_announcement_user_notification_id" FOREIGN KEY ("announcement_id") REFERENCES "announcement"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
          CONSTRAINT "fk_announcement_user_user_id" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
      );
      CREATE INDEX "idx_announcement_user_user_id_read_at" ON "announcement_user" ("user_id", "read_at");
    `);
  }

  public async down(): Promise<void> {}
}
