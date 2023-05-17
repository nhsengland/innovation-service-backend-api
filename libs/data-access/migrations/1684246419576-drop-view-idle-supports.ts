import type { MigrationInterface, QueryRunner } from 'typeorm';

export class dropViewIdleSupport1684246419576 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP VIEW dbo.idle_support_view_entity');
  }

  public async down(): Promise<void> {}
}
