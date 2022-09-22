import type { MigrationInterface, QueryRunner } from 'typeorm';

export class migrateCommentsToMessages1661341116965 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`

      -- Migrate comments created WHEN: needs assessment start.
      -- -- Create threads.
      INSERT INTO innovation_thread (id, innovation_id, context_type, context_id, subject, author_id, created_at, created_by, updated_at, updated_by, deleted_at)
      SELECT
        c.id, c.innovation_id,
        'NEEDS_ASSESSMENT', (SELECT TOP 1 id FROM innovation_assessment ia WHERE ia.innovation_id = c.innovation_id AND deleted_at IS NULL ORDER BY created_at DESC),
        'Initial needs assessment',
        c.user_id,
        c.created_at, c.created_by, c.updated_at, c.updated_by, c.deleted_at
      FROM comment c
      JOIN [user] u ON u.id = c.user_id
      WHERE c.is_editable = 0 AND c.reply_to_id IS NULL AND c.innovation_action_id IS NULL AND c.organisation_unit_id IS NULL AND u.type = 'ASSESSMENT';
      -- -- Create 1st messages.
      INSERT INTO innovation_thread_message (id, innovation_thread_id, message, is_editable, author_id, created_at, created_by, updated_at, updated_by, deleted_at)
      SELECT
        c.id, c.id, c.message, 0,
        c.user_id,
        c.created_at, c.created_by, c.updated_at, c.updated_by, c.deleted_at
      FROM comment c
      JOIN [user] u ON u.id = c.user_id
      WHERE is_editable = 0 AND reply_to_id IS NULL AND innovation_action_id IS NULL AND organisation_unit_id IS NULL AND u.type = 'ASSESSMENT';


      -- Migrate comments created WHEN: support status change.
      -- -- Create threads.
      INSERT INTO innovation_thread (id, innovation_id, context_type, context_id, subject, author_id, created_at, created_by, updated_at, updated_by, deleted_at)
      SELECT
        c.id, c.innovation_id,
        NULL, NULL, -- Is not possible to fetch supports... :(
        CONCAT('Support status changed by ', ou.name),
        c.user_id,
        c.created_at, c.created_by, c.updated_at, c.updated_by, c.deleted_at
      FROM comment c
      LEFT JOIN organisation_unit ou ON ou.id = c.organisation_unit_id
      WHERE c.is_editable = 0 AND c.reply_to_id IS NULL AND c.innovation_action_id IS NULL AND c.organisation_unit_id IS NOT NULL;
      -- -- Create 1st messages.
      INSERT INTO innovation_thread_message (id, innovation_thread_id, message, is_editable, author_id, created_at, created_by, updated_at, updated_by, deleted_at)
      SELECT id, id, message, 0, user_id, created_at, created_by, updated_at, updated_by , deleted_at
      FROM comment
      WHERE is_editable = 0 AND reply_to_id IS NULL AND innovation_action_id IS NULL AND organisation_unit_id IS NOT NULL;


      -- Migrate comments created WHEN: action is updated (by accessor or innovator)
      -- -- Create threads.
      INSERT INTO innovation_thread (id, innovation_id, context_type, context_id, subject, author_id, created_at, created_by, updated_at, updated_by, deleted_at)
      SELECT
        c.id, c.innovation_id,
        'ACTION', c.innovation_action_id,
        CASE WHEN u.type = 'INNOVATOR' THEN CONCAT('Action ', ia.display_id, ' declined by innovator') ELSE CONCAT('Action from ', ounit.acronym, ' organisation unit') END,
        c.user_id,
        c.created_at, c.created_by, c.updated_at, c.updated_by, c.deleted_at
      FROM comment c
      LEFT JOIN [user] u ON u.id = c.user_id
      LEFT JOIN organisation_user ou ON ou.user_id = u.id
      LEFT JOIN organisation_unit_user ouu ON ouu.organisation_user_id = ou.id
      LEFT JOIN organisation_unit ounit ON ounit.id = ouu.organisation_unit_id
      LEFT JOIN innovation_action ia ON ia.id = c.innovation_action_id
      WHERE c.is_editable = 0 AND c.reply_to_id IS NULL AND c.innovation_action_id IS NOT NULL;
      -- -- Create 1st messages.
      INSERT INTO innovation_thread_message (id, innovation_thread_id, message, is_editable, author_id, created_at, created_by, updated_at, updated_by, deleted_at)
      SELECT id, id, message, 0, user_id, created_at, created_by, updated_at, updated_by, deleted_at
      FROM comment
      WHERE is_editable = 0 AND reply_to_id IS NULL AND innovation_action_id IS NOT NULL;


      -- Migrate comments created WHEN: Comments created on comments resource.
      -- -- Create threads.
      INSERT INTO innovation_thread (id, innovation_id, context_type, context_id, subject, author_id, created_at, created_by, updated_at, updated_by, deleted_at)
      SELECT
        id, innovation_id,
        NULL, NULL,
        CONCAT('Legacy comment: ', SUBSTRING(message, 1, 25), '...'), user_id, created_at, created_by, updated_at, updated_by , deleted_at
      FROM comment
      WHERE is_editable = 1 AND reply_to_id IS NULL;
      -- -- Create 1st message.
      INSERT INTO innovation_thread_message (id, innovation_thread_id, message, is_editable, author_id, created_at, created_by, updated_at, updated_by, deleted_at)
      SELECT id, id, message, 1, user_id, created_at, created_by, updated_at, updated_by , deleted_at
      FROM comment
      WHERE is_editable = 1 AND reply_to_id IS NULL;


      -- Migrate remaining messages.
      INSERT INTO innovation_thread_message (id, innovation_thread_id, message, is_editable, author_id, created_at, created_by, updated_at, updated_by, deleted_at)
      SELECT 
        c.id, c.reply_to_id, c.message, 1,
        c.user_id,
        c.created_at, c.created_by, c.updated_at, c.updated_by, c.deleted_at
      FROM comment c
      WHERE reply_to_id IS NOT NULL;

    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`

      DELETE FROM innovation_thread_message;
      DELETE FROM innovation_thread;

    `);

  }

}
