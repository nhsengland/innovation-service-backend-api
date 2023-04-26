import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterInnovationActionsAddColumn1623676793722 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "innovation_action" ADD "display_id" nvarchar(5)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "innovation_action" DROP COLUMN "display_id"`);
  }
}
