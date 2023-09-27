import type { MigrationInterface, QueryRunner } from 'typeorm';

export class fixMigratedTaskMessagePayload1695811979970 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    UPDATE notification SET params=REPLACE(params, '"action', '"task')
    WHERE context_type='TASK' AND JSON_VALUE(params, '$.actionCode') IS NOT NULL
  `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
