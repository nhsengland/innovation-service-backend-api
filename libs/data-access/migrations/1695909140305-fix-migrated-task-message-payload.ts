import type { MigrationInterface, QueryRunner } from 'typeorm';

export class fixMigratedTaskMessagePayload1695909140305 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    UPDATE notification SET params=REPLACE(params, '"action', '"task')
    WHERE context_type='TASK' AND JSON_VALUE(params, '$.actionCode') IS NOT NULL;

    UPDATE notification SET params=JSON_MODIFY(params, '$.taskStatus', 'DONE')
    WHERE context_type='TASK' AND context_detail='TASK_UPDATE' 
    AND JSON_VALUE(params, '$.taskStatus') IN ('SUBMITTED', 'COMPLETED', 'IN_REVIEW');

    UPDATE notification SET params=JSON_MODIFY(params, '$.taskStatus', 'OPEN')
    WHERE context_type='TASK' AND context_detail='TASK_UPDATE' 
    AND JSON_VALUE(params, '$.taskStatus') = 'REQUESTED';
  `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
