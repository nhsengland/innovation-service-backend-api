import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class CreateAddWorkdaysFunction1741277538335 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR ALTER FUNCTION dbo.addWorkDays
(
    @StartDate DATETIME,
    @WorkDays INT
)
RETURNS DATETIME
AS
BEGIN
    DECLARE @EndDate DATETIME = @StartDate
    DECLARE @AddedDays INT = 0

    WHILE @AddedDays < @WorkDays
    BEGIN
        SET @EndDate = DATEADD(DAY, 1, @EndDate)
        IF DATEPART(WEEKDAY, @EndDate) NOT IN (1, 7) -- Exclude Saturday (7) and Sunday (1)
            SET @AddedDays = @AddedDays + 1
    END

    RETURN @EndDate
END
`);
  }
  async down(): Promise<void> {}
}
