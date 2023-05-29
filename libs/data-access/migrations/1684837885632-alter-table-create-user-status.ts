import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableCreateUserStatus1684837885632 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE [user] ADD status nvarchar(20) NOT NULL DEFAULT 'ACTIVE'`);

    await queryRunner.query(`UPDATE [user] SET status = 'LOCKED' WHERE locked_at IS NOT NULL AND deleted_at IS NULL`);

    await queryRunner.query(
      `UPDATE [user] SET status = 'DELETED', updated_at = deleted_at, deleted_at = NULL WHERE deleted_at IS NOT NULL`
    );
  }

  public async down(): Promise<void> {}
}
