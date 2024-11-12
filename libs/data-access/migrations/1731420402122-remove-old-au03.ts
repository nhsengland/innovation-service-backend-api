import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class RemoveOldAU031731420402122 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE notification SET deleted_at=GETDATE() WHERE context_detail='AU03_INNOVATOR_IDLE_SUPPORT'`
    );
  }
  async down(_queryRunner: QueryRunner): Promise<void> {}
}
