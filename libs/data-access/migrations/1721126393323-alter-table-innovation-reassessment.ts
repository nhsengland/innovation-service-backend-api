import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Migrations1721126393323 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE [dbo].[innovation_reassessment_request]
            ALTER COLUMN [updated_innovation_record] NVARCHAR (3) NULL;
        `);

    await queryRunner.query(`
            ALTER TABLE [dbo].[innovation_reassessment_request]
            ALTER COLUMN [description] NVARCHAR (200) NULL;
      `);

    await queryRunner.query(`
            ALTER TABLE [dbo].[innovation_reassessment_request]
            ADD [reason_for_reassessment] NVARCHAR (2000) NULL;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE [dbo].[innovation_reassessment_request]
            DROP COLUMN [reason_for_reassessment];
        `);

    await queryRunner.query(`
            ALTER TABLE [dbo].[innovation_reassessment_request]
            ALTER COLUMN [description] NVARCHAR (200) NOT NULL;
      `);

    await queryRunner.query(`
            ALTER TABLE [dbo].[innovation_reassessment_request]
            ALTER COLUMN [updated_innovation_record] NVARCHAR (3) NOT NULL;
        `);
  }
}
