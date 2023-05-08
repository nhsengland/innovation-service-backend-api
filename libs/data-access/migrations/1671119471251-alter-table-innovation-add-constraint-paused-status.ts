import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableInnovationAddConstraintPausedStatus1671119471251 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "innovation" DROP CONSTRAINT "CK_innovation_status"
    `);

    await queryRunner.query(
      `ALTER TABLE "innovation" ADD CONSTRAINT "CK_innovation_status" CHECK ([status] IN (
        'CREATED',
        'WAITING_NEEDS_ASSESSMENT',
        'NEEDS_ASSESSMENT',
        'IN_PROGRESS',
        'ARCHIVED',
        'COMPLETE',
        'PAUSED'
        ))`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "innovation" DROP CONSTRAINT "CK_innovation_status"
    `);

    await queryRunner.query(
      `ALTER TABLE "innovation" ADD CONSTRAINT "CK_innovation_status" CHECK ([status] IN (
        'CREATED',
        'WAITING_NEEDS_ASSESSMENT',
        'NEEDS_ASSESSMENT',
        'IN_PROGRESS',
        'ARCHIVED',
        'COMPLETE'
        ))`
    );
  }
}
