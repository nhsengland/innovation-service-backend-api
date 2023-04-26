import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableExportRequestChangeFieldSizes1667910679993 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER Table [dbo].[innovation_export_request] 
        ALTER COLUMN [request_reason] varchar(500) NOT NULL
    `);

    await queryRunner.query(`
      ALTER Table [dbo].[innovation_export_request] 
        ALTER COLUMN [reject_reason] varchar(500) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER Table [dbo].[innovation_export_request] 
        ALTER COLUMN [request_reason] varchar(255) NOT NULL
    `);

    await queryRunner.query(`
      ALTER Table [dbo].[innovation_export_request] 
        ALTER COLUMN [reject_reason] varchar(255) NULL
    `);
  }
}
