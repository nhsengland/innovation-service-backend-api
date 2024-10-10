import type { MigrationInterface, QueryRunner } from 'typeorm';

// This view is used to calculate the KPI for the support team, this can be improved once we don't need to query the
// activity log
export class dropViewUnitKPI1728570506531 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW [innovation_support_kpi_view]`);
  }

  async down(): Promise<void> {}
}
