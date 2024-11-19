import { type MigrationInterface, type QueryRunner } from 'typeorm';

export class FixAddMissingSectionsOldInnovations1732011525387 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `INSERT INTO innovation_section (created_at, created_by, updated_at, updated_by, section, status, innovation_id) 
       SELECT i.updated_at, i.created_by, i.updated_at, i.updated_by, 'INNOVATION_DESCRIPTION', 'DRAFT', i.id
       FROM innovation i
       LEFT JOIN innovation_section s ON i.id = s.innovation_id
       WHERE s.section IS NULL`
    );
  }
  async down(): Promise<void> {}
}
