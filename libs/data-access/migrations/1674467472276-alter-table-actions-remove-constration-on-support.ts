import type { MigrationInterface, QueryRunner } from 'typeorm';


export class alterTableActionsRemoveContraintOnSupport1674467472276 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE innovation_action ALTER COLUMN innovation_support_id uniqueidentifier;
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE innovation_action ALTER COLUMN innovation_support_id uniqueidentifier NOT NULL;
    `)
  }

}
