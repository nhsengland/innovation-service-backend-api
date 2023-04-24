import type { MigrationInterface, QueryRunner } from 'typeorm';

export class deleteOldRecordSectionsNotifications1682073232821 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {

    const now = new Date();

    await queryRunner.query(`
    UPDATE notification_user
    SET deleted_at = @0
    WHERE notification_id IN (
      SELECT n.id FROM notification n
      INNER JOIN innovation_action ia ON ia.id = n.context_id
      INNER JOIN innovation_section iis ON iis.id = ia.innovation_section_id
      WHERE iis.section IN ('VALUE_PROPOSITION', 'UNDERSTANDING_OF_BENEFITS', 'COMPARATIVE_COST_BENEFIT')
    )`, [ now ]) 
  }

  public async down(): Promise<void> { }

}
