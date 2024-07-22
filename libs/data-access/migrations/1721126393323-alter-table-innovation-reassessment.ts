import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableInnovationReassessment1721126393323 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE [dbo].[innovation_reassessment_request]
            ALTER COLUMN [updated_innovation_record] NVARCHAR (3) NULL;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            ALTER TABLE [dbo].[innovation_reassessment_request]
            ALTER COLUMN [updated_innovation_record] NVARCHAR (3) NOT NULL;
        `);
  }
}
