import type { MigrationInterface, QueryRunner } from "typeorm";

export class alterIndexInnovationCollaboratorTable1677689127713 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_innovation_collaborator_innovation_id_user_id" ON "innovation_collaborator"`);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_innovation_collaborator_innovation_id_user_id" ON "innovation_collaborator" ("innovation_id", "user_id") WHERE user_id IS NOT NULL AND deleted_at IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_innovation_collaborator_innovation_id_user_id" ON "innovation_collaborator"`);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "idx_innovation_collaborator_innovation_id_user_id" ON "innovation_collaborator" ("innovation_id", "user_id") WHERE deleted_at IS NULL
    `);
  }

}
