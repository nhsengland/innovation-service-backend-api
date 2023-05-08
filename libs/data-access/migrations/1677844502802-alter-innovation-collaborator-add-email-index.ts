import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterInnovationCollaboratorAddEmailIndex1677844502802 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX "idx_innovation_collaborator_email" ON "innovation_collaborator" ("email") WHERE deleted_at IS NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_innovation_collaborator_email" ON "innovation_collaborator"`);
  }
}
