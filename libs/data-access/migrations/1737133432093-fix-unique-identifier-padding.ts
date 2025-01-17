import type { MigrationInterface, QueryRunner } from 'typeorm';

export class FixUniqueIdentifierPadding1737133432093 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      WITH t AS (
        SELECT id,
        CONCAT('INN-',SUBSTRING(CONVERT(varchar,YEAR(created_at)), 3, 2),RIGHT('00' + CONVERT(varchar,MONTH(created_at)), 2),'-', RIGHT('0000' + CONVERT(varchar, ROW_NUMBER() OVER (PARTITION BY YEAR(created_at),MONTH(created_at) ORDER BY created_at)), 4)) as unique_id
        FROM innovation
        ) UPDATE innovation
        SET innovation.unique_id = CONCAT(t.unique_id, '-', (CONVERT(int, SUBSTRING(t.unique_id, 5, 1))
        + CONVERT(int, SUBSTRING(t.unique_id, 6, 1))
        + CONVERT(int, SUBSTRING(t.unique_id, 7, 1))
        + CONVERT(int, SUBSTRING(t.unique_id, 8, 1))
        + CONVERT(int, SUBSTRING(t.unique_id, 10, 1))
        + CONVERT(int, SUBSTRING(t.unique_id, 11, 1))
        + CONVERT(int, SUBSTRING(t.unique_id, 12, 1))
        + CONVERT(int, SUBSTRING(t.unique_id, 13, 1))) % 10)
        FROM innovation i
        INNER JOIN t ON i.id = t.id;
  `);
  }
  async down(): Promise<void> {}
}
