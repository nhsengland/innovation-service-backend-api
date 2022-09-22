import type { MigrationInterface, QueryRunner } from 'typeorm';

export class deleteCommentsNotifications1661341173306 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`

      DELETE FROM notification_user WHERE notification_id IN (
        SELECT id FROM notification WHERE context_type = 'COMMENT'
      );
         
      DELETE FROM notification WHERE context_type = 'COMMENT';
  
    `);

  }

  public async down(): Promise<void> {
    //  Not recoverable!
  }

}
