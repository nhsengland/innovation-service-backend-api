import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableUserAddHowDidYouFindUs1709559213411 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "user" ADD how_did_you_find_us_answers nvarchar(MAX);`);
  }

  public async down(): Promise<void> {}
}
