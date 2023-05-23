import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableActivityLogAddJsonConstraint1679501639491 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activity_log" ADD CONSTRAINT CK_activity_log_is_json CHECK (ISJSON(param)=1);`
    );
    await queryRunner.query(
      `ALTER TABLE "notification" ADD CONSTRAINT CK_notification_is_json CHECK (ISJSON(params)=1);`
    );
    await queryRunner.query(
      `ALTER TABLE "notification_log" ADD CONSTRAINT CK_notification_log_is_json CHECK (ISJSON(params)=1);`
    );
  }

  public async down(): Promise<void> {}
}
