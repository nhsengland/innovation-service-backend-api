import type { MigrationInterface, QueryRunner } from 'typeorm';

export class fixNotificationActionCreationImplementationPlan1682499951771 implements MigrationInterface {

  public async up(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(`UPDATE notification SET params=REPLACE(params,'IMPLEMENTATION_PLAN','DEPLOYMENT') WHERE context_detail='ACTION_CREATION' AND params LIKE '%IMPLEMENTATION_PLAN%}'`);

  }

  public async down(): Promise<void> { }

}
