import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOptimisationIndexes1671016580408 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "idx_notification_innovation_context" ON "notification" ("innovation_id", "context_type", "context_id") WHERE deleted_at IS NULL`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_notification_user_read" ON "notification_user" ("user_id", "read_at") WHERE deleted_at IS NULL`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_organisation_user_user_id" ON "organisation_user" ("user_id") WHERE deleted_at IS NULL`
    );
    await queryRunner.query(
      `CREATE INDEX "idx_organisation_unit_user_organisation_user_id" ON "organisation_unit_user" ("organisation_user_id") WHERE deleted_at IS NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_notification_innovation_context" ON "notification"`);
    await queryRunner.query(`DROP INDEX "idx_notification_user_read" ON "notification_user"`);
    await queryRunner.query(`DROP INDEX "idx_organisation_user_user_id" ON "organisation_user"`);
    await queryRunner.query(
      `DROP INDEX "idx_organisation_unit_user_organisation_user_id" ON "organisation_unit_user"`
    );
  }
}
