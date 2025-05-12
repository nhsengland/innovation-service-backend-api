import type { MigrationInterface, QueryRunner } from 'typeorm';

export class createPastProgressUpdateActivity1747043760030 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO activity_log (created_at, created_by, updated_at, updated_by, innovation_id, type, activity, param, user_role_id)
      SELECT
        sl.updated_at, 
        sl.created_by, 
        sl.updated_at, 
        sl.updated_by, 
        sl.innovation_id, 
        'SUPPORT', 
        'SUPPORT_PROGRESS_UPDATE', 
        JSON_OBJECT('organisationUnit': ou.name, 'progressUpdate': JSON_OBJECT('id': sl.id, 'date': sl.created_at)),
        sl.created_by_user_role_id 
      FROM innovation_support_log sl
      INNER JOIN organisation_unit ou ON sl.organisation_unit_id = ou.id
      WHERE type='PROGRESS_UPDATE';
      `
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM activity_log WHERE type='SUPPORT' AND activity='SUPPORT_PROGRESS_UPDATE';`);
  }
}
