import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableInnovationsAddLastAssessmentRequest1690883700681 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE innovation ADD last_assessment_request_at datetime2`);

    await queryRunner.query(
      `UPDATE innovation SET last_assessment_request_at = submitted_at WHERE submitted_at IS NOT NULL`
    );

    await queryRunner.query(`
      UPDATE innovation 
      SET last_assessment_request_at = r.latest
      FROM innovation i
      INNER JOIN (
        SELECT innovation_id,max(created_at) as latest FROM innovation_reassessment_request
        GROUP BY innovation_id
      ) r on i.id = r.innovation_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE innovation DROP COLUMN last_assessment_request_at');
  }
}
