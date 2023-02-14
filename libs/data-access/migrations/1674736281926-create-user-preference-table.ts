import type { MigrationInterface, QueryRunner } from "typeorm"

export class createUserPreferenceTable1674736281926 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
         //This table stores the user preference for email notifications
        await queryRunner.query(`CREATE TABLE "user_preference" (
            "created_at" datetime2 NOT NULL CONSTRAINT "df_user_preference_created_at" DEFAULT getdate(), 
            "created_by" nvarchar(255), 
            "updated_at" datetime2 NOT NULL CONSTRAINT "df_user_preference_updated_at" DEFAULT getdate(), 
            "updated_by" nvarchar(255),
            "deleted_at" datetime2,
            "user_id" uniqueidentifier NOT NULL,
            "id" uniqueidentifier NOT NULL CONSTRAINT "df_user_preference_id" DEFAULT NEWSEQUENTIALID(),
            "contact_by_phone" bit NOT NULL DEFAULT 0,
            "contact_by_email" bit NOT NULL DEFAULT 0,
            "contact_by_phone_timeframe" nvarchar(255),
            "contact_details" nvarchar(255),
            CONSTRAINT "pk_user_preference_id" PRIMARY KEY ("user_id", "id")
        );`);
        
        await queryRunner.query(
            `ALTER TABLE "user_preference" ADD CONSTRAINT "fk_user_preference_user_user_id" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE "user_preference" DROP CONSTRAINT "fk_user_preference_user_user_id"`
        );
      
        await queryRunner.query(`DROP TABLE "user_preference"`);
    }

}
