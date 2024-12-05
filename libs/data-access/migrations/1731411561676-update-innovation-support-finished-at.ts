import type { MigrationInterface, QueryRunner } from 'typeorm';

export class updateInnovationSupportFinishedAt1731411561676 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE innovation_support SET finished_at=updated_at WHERE status IN ('CLOSED', 'UNSUITABLE') AND finished_at IS NULL`
    );
  }

  public async down(): Promise<void> {}
}
