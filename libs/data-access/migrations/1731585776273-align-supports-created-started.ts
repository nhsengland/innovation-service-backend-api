import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class AlignSupportsCreatedStarted1731585776273 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE innovation_support SET started_at = created_at WHERE DATEDIFF(second, created_at, started_at) < 5`
    );
  }
  async down(): Promise<void> {}
}
