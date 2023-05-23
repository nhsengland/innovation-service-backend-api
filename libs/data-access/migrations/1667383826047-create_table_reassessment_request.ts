import type { MigrationInterface, QueryRunner } from 'typeorm';

export class createTableReassessmentRequest1667383826047 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE "innovation_reassessment_request" (
        "created_at" datetime2 NOT NULL CONSTRAINT "df_innovation_reassessment_request_created_at" DEFAULT getdate(), 
        "created_by" nvarchar(255), 
        "updated_at" datetime2 NOT NULL CONSTRAINT "df_innovation_reassessment_request_updated_at" DEFAULT getdate(), 
        "updated_by" nvarchar(255), 
        "deleted_at" datetime2 NULL,
        "id"  uniqueidentifier NOT NULL CONSTRAINT "df_innovation_reassessment_request_id" DEFAULT NEWSEQUENTIALID(),
        "updated_innovation_record" nvarchar(3) NULL,
        "description" nvarchar(200) NOT NULL,
        "innovation_assessment_id" uniqueidentifier NOT NULL,
        "innovation_id" uniqueidentifier NOT NULL,
        CONSTRAINT "pk_innovation_reassessment_request_id" PRIMARY KEY ("id")
      )`);
    await queryRunner.query(
      `
        ALTER TABLE 
          "innovation_reassessment_request" 
        ADD CONSTRAINT 
          "fk_innovation_reassessment_request_innovation_assessment_assessment_id" 
        FOREIGN KEY ("innovation_assessment_id") REFERENCES "innovation_assessment"("id") 
        ON DELETE NO ACTION ON UPDATE NO ACTION

      `
    );
    await queryRunner.query(
      `
        ALTER TABLE 
          "innovation_reassessment_request" 
        ADD CONSTRAINT 
          "fk_innovation_reassessment_request_innovation_id" 
        FOREIGN KEY ("innovation_id") REFERENCES "innovation"("id") 
        ON DELETE NO ACTION ON UPDATE NO ACTION

      `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "innovation_reassessment_request"`);
  }
}
