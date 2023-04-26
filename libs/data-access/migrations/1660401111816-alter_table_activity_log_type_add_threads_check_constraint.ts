import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableActivityLogTypeAddThreadsCheckConstraint1660401111816
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      declare @Command nvarchar(max) = '';
      select @Command = @Command + 'ALTER TABLE [' + t.name + '] DROP CONSTRAINT ' + d.name + CHAR(10)+ CHAR(13) + ';'
      from sys.tables t
      join sys.check_constraints d  on d.parent_object_id = t.object_id  
      join sys.columns c on c.object_id = t.object_id and c.column_id = d.parent_column_id
      where t.name = 'activity_log' and c.name = 'type';

      execute (@Command);
    `);

    await queryRunner.query(`
      ALTER TABLE "activity_log" ADD CONSTRAINT "CK_activity_log_type" 
      CHECK (type IN ('INNOVATION_MANAGEMENT','INNOVATION_RECORD','NEEDS_ASSESSMENT','SUPPORT','COMMENTS','ACTIONS', 'THREADS'))
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "activity_log" DROP CONSTRAINT "CK_activity_log_type"`);

    await queryRunner.query(
      `ALTER TABLE "activity_log" ADD CONSTRAINT "CK_activity_log_type" 
                    CHECK (type IN ('INNOVATION_MANAGEMENT','INNOVATION_RECORD','NEEDS_ASSESSMENT','SUPPORT','COMMENTS','ACTIONS'))`
    );
  }
}
