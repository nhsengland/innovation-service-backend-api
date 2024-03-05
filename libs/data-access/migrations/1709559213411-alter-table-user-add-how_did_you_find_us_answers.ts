import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterTableUserAddHowDidYouFindUs1709559213411 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "user" ADD how_did_you_find_us_answers nvarchar(MAX) CONSTRAINT "CK_user_how_did_you_find_us_answers_is_json" CHECK (ISJSON(params)=1);`
    );
  }

  public async down(): Promise<void> {}
}
