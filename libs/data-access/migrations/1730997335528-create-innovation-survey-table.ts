import type { MigrationInterface, QueryRunner } from 'typeorm';

export class createInnovationSurveyTable1730997335528 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "innovation_survey"
      (
          "created_at" datetime2 NOT NULL CONSTRAINT "df_innovation_survey_created_at" DEFAULT GETDATE(),
          "updated_at" datetime2 NOT NULL CONSTRAINT "df_innovation_survey_updated_at" DEFAULT GETDATE(),
          "deleted_at" datetime2 NULL,

          "id" uniqueidentifier NOT NULL CONSTRAINT "df_innovation_survey_id" DEFAULT NEWSEQUENTIALID(),
          "type" nvarchar(50) NOT NULL,
          "context_id" UNIQUEIDENTIFIER NOT NULL,
          "target_user_role_id" UNIQUEIDENTIFIER NOT NULL,
          "innovation_id" uniqueidentifier NOT NULL,
          "answers" nvarchar(MAX),

          CONSTRAINT "pk_innovation_survey_id" PRIMARY KEY ("id"),
          CONSTRAINT "fk_innovation_survey_target_user_role_id" FOREIGN KEY ("target_user_role_id") REFERENCES "user_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
          CONSTRAINT "fk_innovation_survey_innovation_id" FOREIGN KEY ("innovation_id") REFERENCES "innovation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
          CONSTRAINT "CK_innovation_survey_is_json" CHECK (ISJSON(answers)=1),
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "innovation_survey"`);
  }
}
