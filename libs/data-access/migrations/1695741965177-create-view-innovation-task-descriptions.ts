import type { MigrationInterface, QueryRunner } from 'typeorm';

export class createViewInnovationTaskDescriptions1695741965177 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    CREATE OR ALTER VIEW [innovation_task_descriptions_view] AS
    SELECT 
      t.id as task_id,
      tm.status as task_message_status,
      m.id as message_id,
	    m.innovation_thread_id as thread_id,
      m.message as description,
      m.created_at,
      u.external_id as created_by_identity_id,
      r.role as created_by_role,
      ou.name as created_by_organisation_unit_name
    FROM innovation_task t
    INNER JOIN innovation_task_message tm ON t.id = tm.innovation_task_id
    INNER JOIN innovation_thread_message m ON tm.innovation_thread_message_id = m.id
    INNER JOIN user_role r ON m.author_user_role_id = r.id
    LEFT JOIN [user] u ON m.author_id = u.id AND u.status != 'DELETED'
    LEFT JOIN organisation_unit ou ON r.organisation_unit_id = ou.id
    WHERE t.deleted_at IS NULL and m.deleted_at IS NULL
  `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
