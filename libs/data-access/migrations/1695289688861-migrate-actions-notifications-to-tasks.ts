import type { MigrationInterface, QueryRunner } from 'typeorm';

export class migrateActionsNotificationsToTasks1695289688861 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    -- Add notification (with temporary field) for the new tasks
    INSERT INTO notification(created_at, created_by, updated_at, updated_by, innovation_id, context_type, context_detail, context_id, params)
    SELECT n.created_at, n.created_by, n.updated_at, n.updated_by, n.innovation_id, 'TASK', REPLACE(context_detail, 'ACTION', 'TASK'), t.id, JSON_MODIFY(JSON_MODIFY(params, '$.taskId', CAST(t.id as nvarchar(40))), '$.srcId', CAST(n.id as nvarchar(40))) FROM notification n
    INNER JOIN innovation_action a ON n.context_id = a.id
    INNER JOIN innovation_task t ON a.innovation_support_id=t.innovation_support_id AND a.innovation_section_id=t.innovation_section_id and a.display_id=t.display_id
    WHERE n.context_type='ACTION' AND n.deleted_at IS NULL;

    -- Add notification user for the new tasks
    INSERT INTO notification_user (created_at, created_by, updated_at, updated_by, deleted_at, notification_id, read_at, user_role_id)
    SELECT nu.created_at, nu.created_by, nu.updated_at, nu.updated_by, nu.deleted_at, n.id, nu.read_at, nu.user_role_id FROM notification n
    INNER JOIN notification_user nu ON JSON_VALUE(n.params, '$.srcId') = nu.notification_id
    WHERE n.context_type='TASK' AND n.deleted_at IS NULL;

    -- Remove temporary field
    UPDATE notification SET params=JSON_MODIFY(params, '$.srcId', null)
    WHERE context_type='TASK' AND JSON_VALUE(params, '$.srcId') IS NOT NULL;

    -- Soft delete old notification and notification_user
    UPDATE notification SET deleted_at=GETDATE() WHERE context_type='ACTION';
    UPDATE notification_user SET deleted_at=n.deleted_at
    FROM notification_user nu
    INNER JOIN notification n ON nu.notification_id=n.id
    WHERE n.context_type='ACTION';
  `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
