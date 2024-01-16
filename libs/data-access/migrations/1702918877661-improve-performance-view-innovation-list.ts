import type { MigrationInterface, QueryRunner } from 'typeorm';

export class improvePerformanceViewInnovationList1702918877661 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Depending on query execution plan, this index is required for performance reasons
    await queryRunner.query(
      `UPDATE [organisation] SET created_by='00000000-0000-0000-0000-000000000000' WHERE created_by IS NULL;
      ALTER TABLE [organisation] ALTER COLUMN created_by uniqueidentifier not null;
      CREATE NONCLUSTERED INDEX idx_organisation_created_by ON dbo.organisation (created_by);`
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {}
}
