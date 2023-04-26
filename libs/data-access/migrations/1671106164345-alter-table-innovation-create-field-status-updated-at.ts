import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableInnovationCreateFieldStatusUpdatedAt1671106164345
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "innovation" ADD "status_updated_at" datetime2 NOT NULL CONSTRAINT "df_innovation_status_updated_at" DEFAULT getdate()
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "innovation" DROP COLUMN "status_updated_at"
    `);
  }
}
