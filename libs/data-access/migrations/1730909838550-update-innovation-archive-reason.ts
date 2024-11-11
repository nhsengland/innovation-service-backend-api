import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class UpdateInnovationArchiveReason1730909838550 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE innovation SET archive_reason = 'LEGACY' WHERE status = 'ARCHIVED'`);
  }
  async down(_queryRunner: QueryRunner): Promise<void> {}
}
