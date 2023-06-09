import type { MigrationInterface, QueryRunner } from 'typeorm';

export class renameInnovationFileToLegacy1686041374936 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`sp_rename 'innovation_file','innovation_file_legacy';`);
  }

  public async down(): Promise<void> {}
}
