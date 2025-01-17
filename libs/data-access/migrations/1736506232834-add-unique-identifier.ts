import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueIdentifier1736506232834 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE innovation ADD unique_id VARCHAR(15) NOT NULL CONSTRAINT "df_innovation_unique_id" DEFAULT ''`
    );

    await queryRunner.query(`
      WITH t AS (
        SELECT id,
        CONCAT('INN-',SUBSTRING(CONVERT(varchar,YEAR(created_at)), 3, 2),MONTH(created_at),'-', RIGHT('0000' + CONVERT(varchar, ROW_NUMBER() OVER (PARTITION BY YEAR(created_at),MONTH(created_at) ORDER BY created_at)), 4)) as unique_id
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

    await queryRunner.query(`ALTER TABLE innovation DROP CONSTRAINT "df_innovation_unique_id"`);
    await queryRunner.query(`ALTER TABLE innovation ADD CONSTRAINT idx_innovation_unique_id UNIQUE (unique_id)`);
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE innovation DROP CONSTRAINT idx_innovation_unique_id`);
    await queryRunner.query(`ALTER TABLE innovation DROP COLUMN unique_id`);
  }
}
