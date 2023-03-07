import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableInnovationSectionAddSubmittedBy1678108086022 implements MigrationInterface {

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "innovation_section" ADD "submitted_by" uniqueidentifier NULL`);

    await queryRunner.query(`
      UPDATE innovation_section
      SET submitted_by = i.owner_id
      FROM innovation_section s
      INNER JOIN innovation i ON i.id = s.innovation_id
      WHERE s.submitted_at IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "innovation_section" DROP COLUMN "submitted_by"`
    );
  }

}
