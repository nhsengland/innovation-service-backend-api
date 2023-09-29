import type { MigrationInterface, QueryRunner } from 'typeorm';

export class migrateOldSupportStatusInMissingTables1695908333942 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      -- UPDATE status inside support_log
      UPDATE innovation_support_log
      SET innovation_support_status =
          CASE
              WHEN innovation_support_status IN ('FURTHER_INFO_REQUIRED', 'NOT_YET') THEN 'WAITING'
              WHEN innovation_support_status = 'COMPLETE' THEN 'CLOSED'
          END
      WHERE innovation_support_status IN ('FURTHER_INFO_REQUIRED', 'NOT_YET', 'COMPLETE');


      -- UPDATE params inside notification
      UPDATE notification
      SET params = JSON_MODIFY(params, '$.supportStatus', (
          CASE
              WHEN JSON_VALUE(params, '$.supportStatus') IN ('FURTHER_INFO_REQUIRED', 'NOT_YET') THEN 'WAITING'
              WHEN JSON_VALUE(params, '$.supportStatus') = 'COMPLETE' THEN 'CLOSED'
          END
      ))
      WHERE context_type = 'SUPPORT' AND JSON_VALUE(params, '$.supportStatus') IN ('FURTHER_INFO_REQUIRED', 'NOT_YET', 'COMPLETE');


      -- UPDATE params in activity_log
      UPDATE activity_log
      SET param = JSON_MODIFY(param, '$.innovationSupportStatus', (
          CASE
              WHEN JSON_VALUE(param, '$.innovationSupportStatus') IN ('FURTHER_INFO_REQUIRED', 'NOT_YET') THEN 'WAITING'
              WHEN JSON_VALUE(param, '$.innovationSupportStatus') = 'COMPLETE' THEN 'CLOSED'
          END
      ))
      WHERE type = 'SUPPORT' AND JSON_VALUE(param, '$.innovationSupportStatus') IN ('FURTHER_INFO_REQUIRED', 'NOT_YET', 'COMPLETE');
    `);
  }

  public async down(): Promise<void> {}
}
