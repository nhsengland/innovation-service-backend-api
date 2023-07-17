import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterSupportLogTableAddParams1689608369414 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE innovation_support_log ADD "params" nvarchar(max) CONSTRAINT "CK_innovation_support_log_is_json" CHECK (ISJSON(params)=1);
      `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE innovation_support_log DROP CONSTRAINT "CK_innovation_support_log_is_json";
        ALTER TABLE innovation_support_log DROP COLUMN "params";
      `);
  }
}
