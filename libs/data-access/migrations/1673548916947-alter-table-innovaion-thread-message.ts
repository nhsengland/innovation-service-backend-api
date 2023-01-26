import type { MigrationInterface, QueryRunner } from 'typeorm'


export class alterTableInnovationThreadMessages1673548916947 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`
      ALTER TABLE "innovation_thread_message" ADD author_organisation_unit_id uniqueidentifier NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "innovation_thread_message" DROP COLUMN author_organisation_unit_id')
  }

}
