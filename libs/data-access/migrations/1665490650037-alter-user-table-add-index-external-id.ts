import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterUserTableAddIndexExternalIdV1665490650037
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE UNIQUE INDEX "idx_user_external_id" ON "user" ("external_id")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_user_external_id" ON "user"`);
  }
}
