import type { MigrationInterface, QueryRunner } from 'typeorm';

export class addIndexNotifyMe1719310027344 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "idx_notify_me_subscription_innovation_event_type" ON "notify_me_subscription" ("innovation_id", "event_type")`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "notify_me_subscription"."idx_notify_me_subscription_innovation_event_type"`);
  }
}
