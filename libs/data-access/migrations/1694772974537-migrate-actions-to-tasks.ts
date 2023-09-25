import type { MigrationInterface, QueryRunner } from 'typeorm';

export class migrateActionsToTasks1694772974537 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "innovation_task" (
        "id" uniqueidentifier NOT NULL CONSTRAINT "df_innovation_task_id" DEFAULT NEWSEQUENTIALID(), 
        "status" nvarchar(255) CONSTRAINT ck_innovation_task_status CHECK( status IN ('OPEN', 'DONE', 'DECLINED', 'CANCELLED') ) NOT NULL, 
        "innovation_section_id" uniqueidentifier NOT NULL,
        "innovation_support_id" uniqueidentifier,
        "display_id" nvarchar(5) NOT NULL,
        "created_by_user_role_id" uniqueidentifier NOT NULL,
        "updated_by_user_role_id" uniqueidentifier NOT NULL,
        "created_at" datetime2 NOT NULL CONSTRAINT "df_innovation_task_created_at" DEFAULT getdate(), 
        "created_by" uniqueidentifier NOT NULL, 
        "updated_at" datetime2 NOT NULL CONSTRAINT "df_innovation_task_updated_at" DEFAULT getdate(), 
        "updated_by" uniqueidentifier NOT NULL, 
        "deleted_at" datetime2,
        [valid_from] datetime2 GENERATED ALWAYS AS ROW START,
        [valid_to] datetime2 GENERATED ALWAYS AS ROW END,
        PERIOD FOR SYSTEM_TIME (valid_from, valid_to),
        CONSTRAINT "pk_innovation_task_id" PRIMARY KEY ("id"),
        CONSTRAINT "fk_innovation_task_innovation_section_id" FOREIGN KEY ("innovation_section_id") REFERENCES "innovation_section"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "fk_innovation_task_innovation_support_id" FOREIGN KEY ("innovation_support_id") REFERENCES "innovation_support"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "fk_innovation_task_created_by_user_role_id" FOREIGN KEY ("created_by_user_role_id") REFERENCES "user_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
        CONSTRAINT "fk_innovation_task_updated_by_user_role_id" FOREIGN KEY ("updated_by_user_role_id") REFERENCES "user_role"("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    ) with (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.innovation_task_history, History_retention_period = 7 YEAR));

    -- create task message relation table
    CREATE TABLE "innovation_task_message" (
      "innovation_task_id" uniqueidentifier NOT NULL,
      "innovation_thread_message_id" uniqueidentifier NOT NULL,
      CONSTRAINT "pk_innovation_innovation_task_message_innovation_task_id_innovation_thread_message_id" PRIMARY KEY ("innovation_task_id", "innovation_thread_message_id")
    );

    ALTER TABLE "innovation_task_message" ADD CONSTRAINT "fk_innovation_task_message_innovation_thread_message_id" FOREIGN KEY ("innovation_thread_message_id") REFERENCES "innovation_thread_message"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
    ALTER TABLE "innovation_task_message" ADD CONSTRAINT "fk_innovation_task_message_innovation_task_id" FOREIGN KEY ("innovation_task_id") REFERENCES "innovation_task"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

    -- insert the tasks, only for the requested actions and valid sections
    INSERT INTO innovation_task (status, innovation_section_id, innovation_support_id, display_id, created_by_user_role_id, updated_by_user_role_id, created_at, created_by, updated_at, updated_by) 
    SELECT 'OPEN', a.innovation_section_id, a.innovation_support_id, a.display_id, a.created_by_user_role_id, a.updated_by_user_role_id, a.created_at, a.created_by, a.updated_at, a.updated_by 
    FROM innovation_action a
    INNER JOIN innovation_section s ON a.innovation_section_id = s.id
    WHERE a.status='REQUESTED' AND a.deleted_at IS NULL
    AND s.deleted_at IS NULL
    AND s.section NOT IN ('COMPARATIVE_COST_BENEFIT','UNDERSTANDING_OF_BENEFITS','VALUE_PROPOSITION') -- these sections are no longer valid

    -- alter context_type and make previous action as unrelated to any context
    ALTER TABLE "innovation_thread" DROP CONSTRAINT "CK_innovation_thread_context_type";
    UPDATE innovation_thread SET context_type = NULL, context_id=NULL WHERE context_type = 'ACTION';
    ALTER TABLE "innovation_thread" ADD CONSTRAINT "CK_innovation_thread_context_type" 
    CHECK (context_type IN ('NEEDS_ASSESSMENT','SUPPORT', 'TASK'));

    -- add the thread records
    INSERT INTO innovation_thread (created_at, created_by, updated_at, innovation_id, author_id, context_type, context_id, author_user_role_id, subject)
    SELECT t.created_at, t.created_by, t.updated_at, s.innovation_id, t.created_by, 'TASK', t.id, t.created_by_user_role_id, 
    CONCAT('TASK (', t.display_id, ') update section ', 
    CASE s.section
    WHEN 'INNOVATION_DESCRIPTION' THEN '1.1 (Description of innovation)'
    WHEN 'UNDERSTANDING_OF_NEEDS' THEN '2.1 (Detailed understanding of needs and benefits)'
    WHEN 'EVIDENCE_OF_EFFECTIVENESS' THEN '2.2 (Evidence of impact and benefit)'
    WHEN 'MARKET_RESEARCH' THEN '3.1 (Market research)'
    WHEN 'CURRENT_CARE_PATHWAY' THEN '3.2 (Current care pathway)'
    WHEN 'TESTING_WITH_USERS' THEN '4.1 (Testing with users)'
    WHEN 'REGULATIONS_AND_STANDARDS' THEN '5.1 (Regulatory approvals, standards and certifications)'
    WHEN 'INTELLECTUAL_PROPERTY' THEN '5.2 (Intellectual property)'
    WHEN 'REVENUE_MODEL' THEN '6.1 (Revenue model)'
    WHEN 'COST_OF_INNOVATION' THEN '7.1 (Cost of your innovation)'
    WHEN 'DEPLOYMENT' THEN '8.1 (Cost of your innovation)'
    ELSE s.section
    END
    )
    FROM innovation_task t
    INNER JOIN innovation_section s ON t.innovation_section_id = s.id;

    -- add the thread messages
    INSERT INTO innovation_thread_message (created_at, created_by, updated_at, updated_by, innovation_thread_id, message, author_id, is_editable, author_organisation_unit_id, author_user_role_id)
    SELECT t.created_at, t.created_by, t.updated_at, t.updated_by, t.id, a.description, a.created_by, 0, r.organisation_unit_id, r.id FROM innovation_thread t
    INNER JOIN innovation_task task ON t.context_id = task.id
    INNER JOIN innovation_action a ON task.display_id = a.display_id AND task.innovation_section_id = a.innovation_section_id
    INNER JOIN user_role r ON task.created_by_user_role_id = r.id
    WHERE t.context_type='TASK';

    -- relate the messages to the tasks
    INSERT INTO innovation_task_message (innovation_task_id, innovation_thread_message_id)
    SELECT t.context_id, m.id FROM innovation_thread t
    INNER JOIN innovation_thread_message m ON t.id = m.innovation_thread_id
    WHERE t.context_type='TASK';

    -- update notification preferences
    UPDATE notification_preference SET notification_type = 'TASK' WHERE notification_type = 'ACTION';

    -- soft delete actions
    ALTER TABLE "activity_log" DROP CONSTRAINT "CK_activity_log_type";
    ALTER TABLE "activity_log" ADD CONSTRAINT "CK_activity_log_type" 
    CHECK (type IN ('INNOVATION_MANAGEMENT','INNOVATION_RECORD','NEEDS_ASSESSMENT','SUPPORT','COMMENTS','ACTIONS', 'THREADS', 'TASKS'))
    UPDATE activity_log SET deleted_at = getdate() WHERE type = 'ACTIONS';
  `);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
