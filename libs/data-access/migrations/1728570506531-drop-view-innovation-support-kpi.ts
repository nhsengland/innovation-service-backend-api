import type { MigrationInterface, QueryRunner } from 'typeorm';

export class dropViewInnovationSupportKPI1728570506531 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW [innovation_support_kpi_view]`);
  }

  async down(): Promise<void> {}
}
