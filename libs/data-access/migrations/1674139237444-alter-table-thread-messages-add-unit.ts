import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableThreadMessagesAddUnit1674139237444 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // This will add current users organisation_unit_id to the thread_messages but will only consider the user first organisation unit when he has more than one
    // there's no way to relate the information when there's more than one unit but this didn't happen except for the dev environment when this was created
    await queryRunner.query(`
    UPDATE innovation_thread_message
    SET author_organisation_unit_id = o.organisation_unit_id
    FROM innovation_thread_message tm
    LEFT JOIN (
      SELECT u.id, ouu.organisation_unit_id FROM [user] u 
      INNER JOIN organisation_user ou ON u.id=ou.user_id 
      INNER JOIN organisation_unit_user ouu ON ouu.organisation_user_id=ou.id
      INNER JOIN (
        SELECT organisation_user_id as id, min(created_at) as created_at FROM organisation_unit_user GROUP BY organisation_user_id
      ) t ON ouu.organisation_user_id = t.id AND ouu.created_at = t.created_at
    ) o ON tm.author_id = o.id
    WHERE organisation_unit_id IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE innovation_thread_message SET author_organisation_unit_id=NULL;`
    );
  }
}
