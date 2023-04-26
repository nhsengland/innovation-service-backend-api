import type { MigrationInterface, QueryRunner } from 'typeorm';

export class createInnovationCollaboratorTable1676569564520 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "innovation_collaborator" (
        "id" uniqueidentifier NOT NULL CONSTRAINT "df_innovation_collaborator_id" DEFAULT NEWSEQUENTIALID(),
        "innovation_id" uniqueidentifier NOT NULL,
        "status" nvarchar(25) NOT NULL,
        "email" nvarchar(100) NOT NULL,
        "user_id" uniqueidentifier NULL,
        "collaborator_role" nvarchar(255) NULL,
        "invited_at" datetime2 NOT NULL,
        "created_at" datetime2 NOT NULL CONSTRAINT "df_innovation_collaborator_created_at" DEFAULT getdate(),
        "created_by" nvarchar(255),
        "updated_at" datetime2 NOT NULL CONSTRAINT "df_innovation_collaborator_updated_at" DEFAULT getdate(),
        "updated_by" nvarchar(255),
        "deleted_at" datetime2,
        [valid_from] datetime2 GENERATED ALWAYS AS ROW START,
        [valid_to] datetime2 GENERATED ALWAYS AS ROW END,
        PERIOD FOR SYSTEM_TIME (valid_from, valid_to),
        CONSTRAINT "pk_innovation_collaborator_id" PRIMARY KEY ("id")
		) with (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.innovation_collaborator_history, History_retention_period = 7 YEAR));`);

    await queryRunner.query(`
      ALTER TABLE "innovation_collaborator" ADD CONSTRAINT "fk_innovation_collaborator_innovation_innovation_id" FOREIGN KEY ("innovation_id") REFERENCES "innovation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "innovation_collaborator" ADD CONSTRAINT "fk_innovation_collaborator_user_user_id" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_innovation_collaborator_innovation_id_user_id" ON "innovation_collaborator" ("innovation_id", "user_id") WHERE deleted_at IS NULL
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_innovation_collaborator_user_id" ON "innovation_collaborator" ("user_id") WHERE deleted_at IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "innovation_collaborator" SET ( SYSTEM_VERSIONING = OFF )
    `);

    await queryRunner.query(`DROP TABLE "innovation_collaborator"`);
    await queryRunner.query(`DROP TABLE "innovation_collaborator_history"`);
  }
}
