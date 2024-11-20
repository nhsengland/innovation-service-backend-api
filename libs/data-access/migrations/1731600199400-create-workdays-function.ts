import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateWorkdaysBetweenFunction1731600199400 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR ALTER FUNCTION workdaysBetween(@start DATETIME2, @end DATETIME2)
      RETURNS int
      WITH EXECUTE AS CALLER
      AS
      BEGIN
        declare @tmp DATETIME2;
        declare @signal int;

        IF (@start > @end)
        BEGIN
          SET @tmp = @start;
        SET @start = @end;
        SET @end = @tmp;
        SET @signal = -1
        END
        ELSE
          SET @signal = 1;

        RETURN @signal*(
        DATEDIFF(dd,@start, @end)
        --Subtact 2 days for each full weekend
        -(DATEDIFF(wk,@start, @end)*2)
        --If StartDate is a Sunday, Subtract 1
        -(CASE WHEN DATENAME(dw, @start) = 'Sunday'
          THEN 1
          ELSE 0
        END)
        --If EndDate is a Saturday, Subtract 1
        -(CASE WHEN DATENAME(dw, @end) = 'Saturday'
          THEN 1
          ELSE 0
        END));
      END`);
  }
  async down(): Promise<void> {}
}
