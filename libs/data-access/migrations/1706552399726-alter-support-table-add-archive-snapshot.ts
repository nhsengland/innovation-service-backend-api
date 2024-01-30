import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterSupportTableAddArchiveSnapshot1706552399726 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        ALTER TABLE innovation_support ADD "archive_snapshot" nvarchar(max) CONSTRAINT "CK_innovation_support_archive_snapshot_is_json" CHECK (ISJSON(archive_snapshot)=1);
`);

    await queryRunner.query(`
      ALTER TABLE "innovation" DROP CONSTRAINT "CK_innovation_status";
      ALTER TABLE "innovation" ADD CONSTRAINT "CK_innovation_status" CHECK ([status] IN (
        'CREATED',
        'WAITING_NEEDS_ASSESSMENT',
        'NEEDS_ASSESSMENT',
        'IN_PROGRESS',
        'WITHDRAWN',
        'COMPLETE',
        'PAUSED',
        'ARCHIVED'
        ))
  `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
  ALTER TABLE innovation_support DROP CONSTRAINT "CK_innovation_support_archive_snapshot_is_json";
  ALTER TABLE innovation_support DROP COLUMN "archive_snapshot";
`);
  }
}
