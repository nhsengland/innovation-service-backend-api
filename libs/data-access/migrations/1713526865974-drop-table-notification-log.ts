import type { MigrationInterface, QueryRunner } from 'typeorm';

export class dropTableNotificationLog1713526865974 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE notification_log;`);
  }

  async down(_queryRunner: QueryRunner): Promise<void> {}
}
