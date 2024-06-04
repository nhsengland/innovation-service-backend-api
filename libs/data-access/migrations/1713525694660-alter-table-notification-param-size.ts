import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableNotificationParamsSize1713525694660 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notification" DROP CONSTRAINT CK_notification_is_json;
      ALTER TABLE "notification" ALTER COLUMN params nvarchar(max);
      ALTER TABLE "notification" ADD CONSTRAINT CK_notification_is_json CHECK (ISJSON(params)=1);
    `);
  }

  public async down(): Promise<void> {}
}
