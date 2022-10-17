import type { MigrationInterface, QueryRunner } from 'typeorm';

export class alterAddColumnInnovationtable1641818295015 implements MigrationInterface {

  async up(queryRunner: QueryRunner): Promise<void> {

    await queryRunner.query(
      `ALTER TABLE "innovation" ADD more_support_description nvarchar(500) NULL;`
    );
  }


  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "innovation" DROP COLUMN "more_support_description"`
    );
  }

}
