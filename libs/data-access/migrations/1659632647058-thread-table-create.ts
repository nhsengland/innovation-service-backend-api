import type { MigrationInterface, QueryRunner } from 'typeorm';

export class threadTableCreate1659632647058 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`
      CREATE TABLE "innovation_thread" (
        "id" uniqueidentifier NOT NULL CONSTRAINT "df_inonvation_thread_id" DEFAULT NEWSEQUENTIALID(),
        "created_at" datetime2 NOT NULL CONSTRAINT "df_innovation_thread_created_at" DEFAULT getdate(), 
        "created_by" nvarchar(255), 
        "updated_at" datetime2 NOT NULL CONSTRAINT "df_innovation_thread_updated_at" DEFAULT getdate(), 
        "updated_by" nvarchar(255), 
        "deleted_at" datetime2 NULL,
        "innovation_id" uniqueidentifier NOT NULL, 
        "subject" nvarchar(100) NOT NULL,
        "author_id" uniqueidentifier NOT NULL,
        CONSTRAINT "pk_innovation_thread_id" PRIMARY KEY ("id"))`);

    await queryRunner.query(`
      CREATE TABLE "innovation_thread_message" (
        "id" uniqueidentifier NOT NULL CONSTRAINT "df_inonvation_thread_message_id" DEFAULT NEWSEQUENTIALID(),
        "created_at" datetime2 NOT NULL CONSTRAINT "df_innovation_thread_message_created_at" DEFAULT getdate(), 
        "created_by" nvarchar(255), 
        "updated_at" datetime2 NOT NULL CONSTRAINT "df_innovation_thread_message_updated_at" DEFAULT getdate(), 
        "updated_by" nvarchar(255), 
        "deleted_at" datetime2 NULL,
        "innovation_thread_id" uniqueidentifier NOT NULL, 
        "message" nvarchar(2000) NOT NULL,
        "author_id" uniqueidentifier NOT NULL,
        CONSTRAINT "pk_innovation_thread_message_id" PRIMARY KEY ("id"))`);

    await queryRunner.query(
      `ALTER TABLE "innovation_thread" ADD CONSTRAINT "fk_innovation_thread_innovation" FOREIGN KEY ("innovation_id") REFERENCES "innovation"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE "innovation_thread" ADD CONSTRAINT "fk_innovation_thread_user" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE "innovation_thread_message" ADD CONSTRAINT "fk_innovation_thread_innovation_thread_message" FOREIGN KEY ("innovation_thread_id") REFERENCES "innovation_thread"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );

    await queryRunner.query(
      `ALTER TABLE "innovation_thread_message" ADD CONSTRAINT "fk_innovation_thread_message_user" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`
    );

  }

  public async down(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`DROP TABLE innovation_thread_message`);
    await queryRunner.query(`DROP TABLE innovation_thread`);

  }

}
