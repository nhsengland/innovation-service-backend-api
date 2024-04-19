import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableThreadsSubjectSize1713526603177 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "innovation_thread" ALTER COLUMN "subject" nvarchar(1000) NOT NULL;`);
  }

  public async down(): Promise<void> {}
}
