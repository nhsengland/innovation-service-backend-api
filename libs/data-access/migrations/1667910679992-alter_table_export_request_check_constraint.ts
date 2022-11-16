import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableExportRequestCheckConstraint1667910679992
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      declare @Command nvarchar(max) = '';
      select @Command = @Command + 'ALTER TABLE [' + t.name + '] DROP CONSTRAINT ' + d.name + CHAR(10)+ CHAR(13) + ';'
      from sys.tables t
      join sys.check_constraints d  on d.parent_object_id = t.object_id  
      join sys.columns c on c.object_id = t.object_id and c.column_id = d.parent_column_id
      where t.name = 'innovation_export_request' and c.name = 'status';
      execute (@Command);
    `);
    await queryRunner.query(`
      ALTER TABLE [dbo].[innovation_export_request] ADD CONSTRAINT "CK_innovation_export_request_status" CHECK (status IN ('PENDING','APPROVED','REJECTED','CANCELLED'));
    `);
    
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP CONSTRAINT "CK_innovation_export_request_status"`
    );
  
  }
}
