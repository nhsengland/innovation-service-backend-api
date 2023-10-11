import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWaitingSupportQAToAssigned1696943896450 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
    INSERT INTO innovation_support_user (innovation_support_id, user_role_id)
    SELECT s.id,r.id FROM innovation_support s
    INNER JOIN user_role r ON s.updated_by=r.user_id AND s.organisation_unit_id=r.organisation_unit_id
    WHERE s.status='WAITING' AND r.is_active=1
    AND NOT EXISTS(SELECT 1 FROM innovation_support_user t WHERE t.innovation_support_id=s.id AND t.user_role_id=r.id);
    `);
  }

  public async down(): Promise<void> {}
}
