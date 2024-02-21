import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterInnovationWithdrawReasonWithArchiveReason1708527845312 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`exec sp_rename 'innovation.withdraw_reason', 'archive_reason', 'COLUMN'`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`exec sp_rename 'innovation.archive_reason', 'withdraw_reason', 'COLUMN'`);
  }
}
